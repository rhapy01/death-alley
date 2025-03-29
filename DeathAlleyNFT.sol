// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract DeathAlleyNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    using Strings for uint256;
    
    Counters.Counter private _tokenIds;
    
    // NFT related mappings
    mapping(uint256 => string) private _tokenTypes; // "achievement", "badge", "vengeance"
    mapping(address => uint256[]) private _ownerTokens;
    mapping(address => mapping(string => bool)) private _mintedAchievements;
    mapping(address => mapping(string => bool)) private _mintedBadges;
    mapping(address => bool) private _mintedVengeanceNFT;
    
    // Achievement and Badge supply limits
    mapping(string => uint256) private _achievementSupply;
    mapping(string => uint256) private _badgeSupply;
    uint256 public constant VENGEANCE_NFT_SUPPLY = 5000; // Per milestone level
    uint256 public constant MAX_MILESTONE_LEVEL = 5;
    
    // Leaderboard related state variables
    struct Score {
        address player;
        uint256 score;
        uint256 timestamp;
        uint256 level; // Current level in Death Alley (1-50)
        bool completedAlley; // Whether player has completed Death Alley
    }
    
    Score[] public topScores;
    mapping(address => Score) public playerBestScores;
    uint256 public constant MAX_SCORES = 100;
    uint256 public lastRefreshTime;
    
    // Base URI for token metadata
    string private _baseTokenURI;
    
    // Daily check-in related state variables
    struct CheckIn {
        uint256 lastCheckIn;
        uint256 consecutiveDays;
        uint256 totalCheckIns;
        uint256 experience; // EXP from check-ins
    }
    
    mapping(address => CheckIn) public playerCheckIns;
    
    // Experience and level tracking
    mapping(address => uint256) public playerExperience;
    mapping(address => uint256) public playerLevel;
    
    // Error definitions
    error InvalidAddress();
    error EmptyId();
    error AlreadyMinted(string id);
    error VengeanceNFTAlreadyMinted();
    error SupplyExhausted(string id);
    error ArrayLengthMismatch();
    error TokenDoesNotExist(uint256 tokenId);
    error InvalidScore();
    error InvalidLevel();
    error InsufficientLevel(uint256 required, uint256 current);
    
    // Events
    event AchievementMinted(address indexed player, string achievementId, uint256 tokenId);
    event BadgeMinted(address indexed player, string badgeId, uint256 tokenId);
    event VengeanceNFTMinted(address indexed player, uint256 tokenId, uint256 milestoneLevel);
    event BaseURIUpdated(string newBaseURI);
    event ScoreSubmitted(address indexed player, uint256 score, uint256 level, uint256 timestamp);
    event NewTopScore(address indexed player, uint256 score, uint256 rank);
    event LeaderboardRefreshed(uint256 timestamp);
    event DailyCheckIn(address indexed player, uint256 consecutiveDays, uint256 experience, uint256 timestamp);
    event LevelUp(address indexed player, uint256 newLevel, uint256 experience);
    event AlleyCompleted(address indexed player, uint256 finalScore, uint256 timestamp);
    
    constructor() ERC721("Death Alley NFT", "DEATH") Ownable(msg.sender) {
        lastRefreshTime = block.timestamp;
        
        // Initialize achievement supplies (5000 each)
        _achievementSupply["FIRST_BLOOD"] = 5000;
        _achievementSupply["VEHICULAR_MANSLAUGHTER"] = 5000;
        _achievementSupply["DESTRUCTION_DERBY"] = 5000;
        _achievementSupply["PRECISION"] = 5000;
        _achievementSupply["ROAD_WARRIOR"] = 5000;
        _achievementSupply["HIGHWAY_TO_HELL"] = 5000;
        _achievementSupply["DEATH_ALLEY_MASTER"] = 5000;
        _achievementSupply["FULL_THROTTLE"] = 5000;
        _achievementSupply["SPEED_DEMON"] = 5000;
        _achievementSupply["CHECKPOINT_HUNTER"] = 5000;
        
        // Initialize badge supplies
        _badgeSupply["BRONZE_WARRIOR"] = 5000;
        _badgeSupply["SILVER_WARRIOR"] = 5000;
        _badgeSupply["GOLD_WARRIOR"] = 5000;
        _badgeSupply["PLATINUM_WARRIOR"] = 5000;
        _badgeSupply["DIAMOND_WARRIOR"] = 5000;
    }

    // Leaderboard Functions
    function submitScore(uint256 _score, uint256 _level, bool _completedAlley) public {
        if (_score == 0) revert InvalidScore();
        if (_level == 0 || _level > 50) revert InvalidLevel();

        Score memory newScore = Score(msg.sender, _score, block.timestamp, _level, _completedAlley);

        // Update player's best score if new score is higher
        if (_score > playerBestScores[msg.sender].score) {
            playerBestScores[msg.sender] = newScore;
            updateTopScores(newScore);
        }

        // Handle Alley completion
        if (_completedAlley) {
            emit AlleyCompleted(msg.sender, _score, block.timestamp);
        }

        emit ScoreSubmitted(msg.sender, _score, _level, block.timestamp);
    }

    function updateTopScores(Score memory newScore) private {
        bool inserted = false;
        uint256 position = topScores.length;

        // Find position for new score
        for (uint256 i = 0; i < topScores.length; i++) {
            if (newScore.score > topScores[i].score) {
                position = i;
                break;
            }
        }

        // Insert new score at correct position
        if (position < MAX_SCORES) {
            if (topScores.length < MAX_SCORES) {
                topScores.push(newScore);
            }
            
            // Shift elements to make room for new score
            for (uint256 i = topScores.length - 1; i > position; i--) {
                topScores[i] = topScores[i - 1];
            }
            topScores[position] = newScore;
            inserted = true;
        }

        if (inserted) {
            // Trim array if needed
            while (topScores.length > MAX_SCORES) {
                topScores.pop();
            }
            emit NewTopScore(newScore.player, newScore.score, position + 1);
        }
    }

    // Daily check-in functions with experience system
    function checkIn() public {
        CheckIn storage userCheckIn = playerCheckIns[msg.sender];
        uint256 currentDay = block.timestamp / 86400; // Convert to days
        uint256 lastCheckInDay = userCheckIn.lastCheckIn / 86400;
        
        // Ensure user hasn't already checked in today
        require(currentDay > lastCheckInDay, "Already checked in today");
        
        // Calculate experience gained
        uint256 expGained = 100; // Base experience
        
        // Bonus for consecutive days
        if (currentDay == lastCheckInDay + 1) {
            userCheckIn.consecutiveDays++;
            // Bonus exp for consecutive days (max 50% bonus)
            expGained += (expGained * Math.min(userCheckIn.consecutiveDays, 50)) / 100;
        } else {
            userCheckIn.consecutiveDays = 1;
        }
        
        userCheckIn.lastCheckIn = block.timestamp;
        userCheckIn.totalCheckIns++;
        userCheckIn.experience += expGained;
        
        // Update total player experience
        playerExperience[msg.sender] += expGained;
        
        // Check for level up
        checkAndUpdateLevel(msg.sender);
        
        emit DailyCheckIn(msg.sender, userCheckIn.consecutiveDays, expGained, block.timestamp);
    }
    
    function checkAndUpdateLevel(address player) private {
        uint256 currentExp = playerExperience[player];
        uint256 currentLevel = playerLevel[player];
        
        // Level up formula: each level requires base_exp * (level + 1)
        uint256 baseExp = 1000;
        uint256 nextLevelExp = baseExp * (currentLevel + 1);
        
        while (currentExp >= nextLevelExp) {
            currentLevel++;
            nextLevelExp = baseExp * (currentLevel + 1);
        }
        
        if (currentLevel > playerLevel[player]) {
            playerLevel[player] = currentLevel;
            emit LevelUp(player, currentLevel, currentExp);
            
            // Check for Vengeance NFT eligibility
            if (currentLevel >= 10 && currentLevel % 10 == 0 && currentLevel <= 50) {
                uint256 milestoneLevel = currentLevel / 10;
                if (!_mintedVengeanceNFT[player]) {
                    mintVengeanceNFT(player, milestoneLevel);
                }
            }
        }
    }
    
    function mintVengeanceNFT(address player, uint256 milestoneLevel) private {
        if (player == address(0)) revert InvalidAddress();
        if (_mintedVengeanceNFT[player]) revert VengeanceNFTAlreadyMinted();
        if (milestoneLevel == 0 || milestoneLevel > MAX_MILESTONE_LEVEL) revert InvalidLevel();
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(player, newTokenId);
        
        // Set token URI based on milestone level
        string memory tokenURI = string(abi.encodePacked(
            "ipfs://QmVengeanceNFT/",
            milestoneLevel.toString(),
            "/",
            newTokenId.toString()
        ));
        _setTokenURI(newTokenId, tokenURI);
        
        _tokenTypes[newTokenId] = "vengeance";
        _ownerTokens[player].push(newTokenId);
        _mintedVengeanceNFT[player] = true;
        
        emit VengeanceNFTMinted(player, newTokenId, milestoneLevel);
    }
    
    function mintAchievement(
        address player,
        string calldata achievementId,
        string calldata tokenURI
    ) public returns (uint256) {
        if (player == address(0)) revert InvalidAddress();
        if (bytes(achievementId).length == 0) revert EmptyId();
        if (_mintedAchievements[player][achievementId]) revert AlreadyMinted(achievementId);
        if (_achievementSupply[achievementId] == 0) revert SupplyExhausted(achievementId);
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(player, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        _tokenTypes[newTokenId] = "achievement";
        _ownerTokens[player].push(newTokenId);
        _mintedAchievements[player][achievementId] = true;
        _achievementSupply[achievementId]--;
        
        // Grant experience for achievement
        uint256 expGained = 500; // Base achievement experience
        playerExperience[player] += expGained;
        checkAndUpdateLevel(player);
        
        emit AchievementMinted(player, achievementId, newTokenId);
        return newTokenId;
    }
    
    function mintBadge(
        address player,
        string calldata badgeId,
        string calldata tokenURI
    ) public returns (uint256) {
        if (player == address(0)) revert InvalidAddress();
        if (bytes(badgeId).length == 0) revert EmptyId();
        if (_mintedBadges[player][badgeId]) revert AlreadyMinted(badgeId);
        if (_badgeSupply[badgeId] == 0) revert SupplyExhausted(badgeId);
        
        // Check level requirements for badges
        uint256 requiredLevel = getRequiredLevelForBadge(badgeId);
        if (playerLevel[player] < requiredLevel) {
            revert InsufficientLevel(requiredLevel, playerLevel[player]);
        }
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(player, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        _tokenTypes[newTokenId] = "badge";
        _ownerTokens[player].push(newTokenId);
        _mintedBadges[player][badgeId] = true;
        _badgeSupply[badgeId]--;
        
        // Grant experience for badge
        uint256 expGained = 1000; // Base badge experience
        playerExperience[player] += expGained;
        checkAndUpdateLevel(player);
        
        emit BadgeMinted(player, badgeId, newTokenId);
        return newTokenId;
    }
    
    function getRequiredLevelForBadge(string memory badgeId) private pure returns (uint256) {
        bytes32 badgeHash = keccak256(bytes(badgeId));
        
        if (badgeHash == keccak256(bytes("BRONZE_WARRIOR"))) return 10;
        if (badgeHash == keccak256(bytes("SILVER_WARRIOR"))) return 20;
        if (badgeHash == keccak256(bytes("GOLD_WARRIOR"))) return 30;
        if (badgeHash == keccak256(bytes("PLATINUM_WARRIOR"))) return 40;
        if (badgeHash == keccak256(bytes("DIAMOND_WARRIOR"))) return 50;
        
        return 0;
    }
    
    // View functions
    function getPlayerProgress(address player) public view returns (
        uint256 level,
        uint256 experience,
        uint256 checkInStreak,
        uint256 totalCheckIns,
        bool hasVengeanceNFT,
        uint256 achievementCount,
        uint256 badgeCount
    ) {
        level = playerLevel[player];
        experience = playerExperience[player];
        checkInStreak = playerCheckIns[player].consecutiveDays;
        totalCheckIns = playerCheckIns[player].totalCheckIns;
        hasVengeanceNFT = _mintedVengeanceNFT[player];
        
        uint256[] memory tokens = _ownerTokens[player];
        uint256 achievements = 0;
        uint256 badges = 0;
        
        for (uint256 i = 0; i < tokens.length; i++) {
            bytes32 typeHash = keccak256(bytes(_tokenTypes[tokens[i]]));
            if (typeHash == keccak256(bytes("achievement"))) {
                achievements++;
            } else if (typeHash == keccak256(bytes("badge"))) {
                badges++;
            }
        }
        
        achievementCount = achievements;
        badgeCount = badges;
    }
    
    // Additional helper functions from the original contract remain the same...
} 