// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract DeathAlleyRewards is ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    // Simple structs for token metadata
    struct TokenMetadata {
        string name;
        string uri;
    }

    struct CheckIn {
        uint256 lastCheckIn;
        uint256 consecutiveDays;
        uint256 totalCheckIns;
    }

    // Mappings
    mapping(uint256 => TokenMetadata) public achievementBadges;
    mapping(uint256 => TokenMetadata) public nftTiers;
    mapping(address => mapping(uint256 => bool)) public hasMinted; // Track if user has minted specific achievement
    mapping(address => CheckIn) public checkIns;

    // Constants for check-in
    uint256 public constant SECONDS_PER_DAY = 86400;

    // Events
    event BadgeMinted(address indexed player, uint256 indexed badgeId, string name);
    event NFTMinted(address indexed player, uint256 indexed tierId, string name);
    event DailyCheckIn(address indexed player, uint256 consecutiveDays);

    constructor(address initialOwner) ERC721("Death Alley Rewards", "DAR") Ownable(initialOwner) {
        // Initialize NFT tiers with metadata
        nftTiers[1] = TokenMetadata("Rookie Warrior", "ipfs://rookie-warrior");
        nftTiers[2] = TokenMetadata("Veteran Striker", "ipfs://veteran-striker");
        nftTiers[3] = TokenMetadata("Elite Commander", "ipfs://elite-commander");
        nftTiers[4] = TokenMetadata("Master Tactician", "ipfs://master-tactician");
        nftTiers[5] = TokenMetadata("Legendary Champion", "ipfs://legendary-champion");
    }

    // Admin function to add achievement badges
    function addAchievementBadge(
        uint256 badgeId,
        string memory name,
        string memory uri
    ) external onlyOwner {
        achievementBadges[badgeId] = TokenMetadata(name, uri);
    }

    // Mint achievement badge - called when UI confirms achievement is unlocked
    function mintAchievementBadge(uint256 badgeId) external nonReentrant {
        require(!hasMinted[msg.sender][badgeId], "Already minted this badge");
        require(bytes(achievementBadges[badgeId].uri).length > 0, "Badge does not exist");

        hasMinted[msg.sender][badgeId] = true;
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, achievementBadges[badgeId].uri);

        emit BadgeMinted(msg.sender, badgeId, achievementBadges[badgeId].name);
    }

    // Mint NFT - called when UI confirms requirements are met
    function mintNFT(uint256 tierId) external nonReentrant {
        require(bytes(nftTiers[tierId].uri).length > 0, "Invalid tier");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, nftTiers[tierId].uri);

        emit NFTMinted(msg.sender, tierId, nftTiers[tierId].name);
    }

    // Daily Check-in System
    function dailyCheckIn() external nonReentrant {
        CheckIn storage checkIn = checkIns[msg.sender];
        require(
            block.timestamp >= checkIn.lastCheckIn + SECONDS_PER_DAY,
            "Already checked in today"
        );

        // Reset consecutive days if more than 48 hours have passed
        if (block.timestamp >= checkIn.lastCheckIn + (2 * SECONDS_PER_DAY)) {
            checkIn.consecutiveDays = 0;
        }

        // Update check-in data
        checkIn.lastCheckIn = block.timestamp;
        checkIn.consecutiveDays++;
        checkIn.totalCheckIns++;

        emit DailyCheckIn(msg.sender, checkIn.consecutiveDays);
    }

    function getCheckInStatus(address player)
        external
        view
        returns (uint256 lastCheckIn, uint256 consecutiveDays, uint256 totalCheckIns)
    {
        CheckIn memory checkIn = checkIns[player];
        return (checkIn.lastCheckIn, checkIn.consecutiveDays, checkIn.totalCheckIns);
    }
} 