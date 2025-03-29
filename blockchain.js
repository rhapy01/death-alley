// Initialize userProfile if it doesn't exist
window.userProfile = window.userProfile || {
    xp: { level: 1 },
    nfts: [],
    achievements: [],
    badges: []
};

// Chain configurations
const SUPPORTED_CHAINS = {
    LINEA_SEPOLIA: {
        chainId: '0xe705', // 59141 in hex
        chainName: 'Linea Sepolia',
        nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18
        },
        rpcUrls: ['https://rpc.sepolia.linea.build'],
        blockExplorerUrls: ['https://sepolia.lineascan.build'],
        contractAddress: '0x3cfa46f5e9cb983479793fc5fe826989f0a212a7'
    },
    BASE_SEPOLIA: {
        chainId: '0x14a34', // 84532 in hex
        chainName: 'Base Sepolia Testnet',
        nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18
        },
        rpcUrls: ['https://rpc.notadegen.com/base/sepolia'],
        blockExplorerUrls: ['https://sepolia.basescan.org'],
        contractAddress: '0x0000000000000000000000000000000000000000' // TODO: Replace with actual Base Sepolia contract address
    },
    BASE: {
        chainId: '0x2105', // 8453 in hex
        chainName: 'Base',
        nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18
        },
        rpcUrls: ['https://mainnet.base.org'],
        blockExplorerUrls: ['https://basescan.org'],
        contractAddress: '0x6ab660f4c63d9928290aaca11a1a174d6e2a550a' // TODO: Replace with actual Base Mainnet contract address
    }
};

// Add chain name mapping for UI
const CHAIN_NAMES = {
    '0x2105': 'Base',
    '0x14a34': 'Base Sepolia',
    '0xe705': 'Linea Sepolia'
};

// Contract configuration
const CONTRACT_ABI = [
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "badgeId",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "uri",
				"type": "string"
			}
		],
		"name": "addAchievementBadge",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "approve",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "initialOwner",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "ERC721IncorrectOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "operator",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "ERC721InsufficientApproval",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "approver",
				"type": "address"
			}
		],
		"name": "ERC721InvalidApprover",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "operator",
				"type": "address"
			}
		],
		"name": "ERC721InvalidOperator",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "ERC721InvalidOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "receiver",
				"type": "address"
			}
		],
		"name": "ERC721InvalidReceiver",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			}
		],
		"name": "ERC721InvalidSender",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "ERC721NonexistentToken",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "OwnableInvalidOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "OwnableUnauthorizedAccount",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "approved",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "Approval",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "operator",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "approved",
				"type": "bool"
			}
		],
		"name": "ApprovalForAll",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "badgeId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "name",
				"type": "string"
			}
		],
		"name": "BadgeMinted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "_fromTokenId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "_toTokenId",
				"type": "uint256"
			}
		],
		"name": "BatchMetadataUpdate",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "dailyCheckIn",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "consecutiveDays",
				"type": "uint256"
			}
		],
		"name": "DailyCheckIn",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "_tokenId",
				"type": "uint256"
			}
		],
		"name": "MetadataUpdate",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "badgeId",
				"type": "uint256"
			}
		],
		"name": "mintAchievementBadge",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tierId",
				"type": "uint256"
			}
		],
		"name": "mintNFT",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "tierId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "name",
				"type": "string"
			}
		],
		"name": "NFTMinted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "safeTransferFrom",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			},
			{
				"internalType": "bytes",
				"name": "data",
				"type": "bytes"
			}
		],
		"name": "safeTransferFrom",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "operator",
				"type": "address"
			},
			{
				"internalType": "bool",
				"name": "approved",
				"type": "bool"
			}
		],
		"name": "setApprovalForAll",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "Transfer",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "transferFrom",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "achievementBadges",
		"outputs": [
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "uri",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "balanceOf",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "checkIns",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "lastCheckIn",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "consecutiveDays",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "totalCheckIns",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "getApproved",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "player",
				"type": "address"
			}
		],
		"name": "getCheckInStatus",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "lastCheckIn",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "consecutiveDays",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "totalCheckIns",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "hasMinted",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "operator",
				"type": "address"
			}
		],
		"name": "isApprovedForAll",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "name",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "nftTiers",
		"outputs": [
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "uri",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "ownerOf",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "SECONDS_PER_DAY",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes4",
				"name": "interfaceId",
				"type": "bytes4"
			}
		],
		"name": "supportsInterface",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "symbol",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "tokenURI",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

class BlockchainManager {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.account = null;
        this.isConnected = false;
        this.currentChain = null;
        this.isInitializing = false;
        this.logCounter = 0;
    }

    _log(message) {
        console.log(`[${++this.logCounter}] BlockchainManager: ${message}`);
    }

    // Helper method to get the current chain's contract address
    getContractAddress() {
        if (!this.currentChain) {
            this._log('No chain selected, cannot get contract address');
            return null;
        }

        const chainConfig = Object.values(SUPPORTED_CHAINS).find(chain => chain.chainId === this.currentChain);
        if (!chainConfig) {
            this._log(`Chain ${this.currentChain} not found in supported chains`);
            return null;
        }

        if (!chainConfig.contractAddress || chainConfig.contractAddress === '0x0000000000000000000000000000000000000000') {
            this._log(`No contract address configured for chain ${chainConfig.chainName}`);
            return null;
        }

        return chainConfig.contractAddress;
    }

    // Modify the contract initialization logic to use chain-specific addresses
    async initializeContract() {
        this._log('Initializing contract...');
        const contractAddress = this.getContractAddress();
        
        if (!contractAddress) {
            this._log('Failed to initialize contract: No valid contract address for current chain');
            this.contract = null;
            return false;
        }
            
        try {
            this.contract = new this.web3.eth.Contract(CONTRACT_ABI, contractAddress);
            this._log(`Contract initialized with address ${contractAddress}`);
            
            // Set up event listeners
            this.setupContractEventListeners();
            
            return true;
        } catch (error) {
            this._log(`Failed to initialize contract: ${error.message}`);
            this.contract = null;
            return false;
        }
    }

    setupContractEventListeners() {
        if (!this.contract) return;

        // Listen for DailyCheckIn events
        this.contract.events.DailyCheckIn({
            filter: { player: this.account }
        })
        .on('data', (event) => {
            this._log('DailyCheckIn event received:', event);
            const { player, consecutiveDays } = event.returnValues;
            if (player.toLowerCase() === this.account.toLowerCase()) {
                // Update local state
                if (window.userProfile) {
                    window.userProfile.addXP(500); // Base XP for check-in
                }
                this.showNotification(`Daily check-in streak: ${consecutiveDays} days!`);
            }
        })
        .on('error', console.error);

        // Listen for BadgeMinted events
        this.contract.events.BadgeMinted({
            filter: { player: this.account }
        })
        .on('data', (event) => {
            this._log('BadgeMinted event received:', event);
            const { player, badgeId, name } = event.returnValues;
            if (player.toLowerCase() === this.account.toLowerCase()) {
                // Update local state
                if (window.userProfile && window.userProfile.achievements) {
                    window.userProfile.achievements.push({
                        id: badgeId,
                        name: name
                    });
                }
                this.showNotification(`Achievement unlocked: ${name}!`);
            }
        })
        .on('error', console.error);

        // Listen for NFTMinted events
        this.contract.events.NFTMinted({
            filter: { player: this.account }
        })
        .on('data', (event) => {
            this._log('NFTMinted event received:', event);
            const { player, tierId, name } = event.returnValues;
            if (player.toLowerCase() === this.account.toLowerCase()) {
                // Update local state
                if (window.userProfile && window.userProfile.nfts) {
                    window.userProfile.nfts.push({
                        id: tierId,
                        name: name
                    });
                }
                this.showNotification(`NFT Minted: ${name}!`);
            }
        })
        .on('error', console.error);
    }

    // Update the init method to use the new contract initialization
    async init() {
        this._log('init() called');
        if (this.isInitializing) {
            this._log('Initialization already in progress. Exiting init().');
            return;
        }
        this.isInitializing = true;
        this._log('Starting initialization...');

        try {
            if (typeof window.ethereum !== 'undefined') {
                this._log('window.ethereum detected');
                this.web3 = new Web3(window.ethereum);
                this._log('Web3 instance created');

                // Setup event listeners
                window.ethereum.removeAllListeners('accountsChanged');
                window.ethereum.removeAllListeners('chainChanged');
                window.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));
                window.ethereum.on('chainChanged', this.handleChainChanged.bind(this));
                this._log('Event listeners attached');

                // Check initial account state
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                    await this.handleAccountsChanged(accounts);
                    } else {
                    this._log('No accounts found initially.');
                        this.isConnected = false;
                    this.account = null;
                }

                // Check initial chain state and initialize contract
                if (this.isConnected) {
                    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                    await this.handleChainChanged(chainId);
                    await this.initializeContract();
                }

                this.updateConnectedUI();
                this.isInitializing = false;
                this._log('Initialization finished successfully.');
                return true;
            } else {
                this._log('window.ethereum not found.');
                alert('Please install MetaMask to use blockchain features.');
                this.isInitializing = false;
                return false;
            }
        } catch (error) {
            this._log(`Initialization failed: ${error.message}`);
            this.isInitializing = false;
            return false;
        }
    }
    
    // Update the handleChainChanged method to reinitialize the contract
    async handleChainChanged(chainId) {
        this._log(`handleChainChanged called with chainId: ${chainId}`);
        if (chainId !== this.currentChain) {
            this._log(`Chain changed from ${this.currentChain} to ${chainId}`);
            this.currentChain = chainId;
            if (this.isConnected) {
                await this.validateChain();
                await this.initializeContract();
            }
        }
        this.updateConnectedUI();
    }

    async handleAccountsChanged(accounts) {
        this._log(`handleAccountsChanged called with: ${JSON.stringify(accounts)}`);
            if (accounts.length > 0) {
            const newAccount = accounts[0];
            if (newAccount !== this.account) {
                this._log(`Account changed from ${this.account} to ${newAccount}`);
                this.account = newAccount;
                this.isConnected = true;
                // We might need to re-check chain state if account changed
                try {
                    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                    this.currentChain = chainId;
                    await this.validateChain(); // Validate chain for the new account context
                } catch (e) {
                    this._log(`Error getting chainId after account change: ${e.message}`);
                    this.currentChain = null;
                }
            } else {
                 this._log('Account received is the same as current. No state change.');
                 this.isConnected = true; // Still connected
            }
        } else {
            this._log('Accounts array empty - disconnected.');
            this.account = null;
                this.isConnected = false;
            this.contract = null; // Clear contract instance
            }
        this.updateConnectedUI(); // Update UI after processing
    }

    async validateChain() {
        this._log(`validateChain called for chain: ${this.currentChain}`);
        if (!this.isConnected || !this.currentChain) {
            this._log('Validation skipped: Not connected or no current chain.');
            return false; // Cannot validate if not connected or chain is unknown
        }

        const supportedChainIds = Object.values(SUPPORTED_CHAINS).map(chain => chain.chainId);
        const isSupported = supportedChainIds.includes(this.currentChain);
        
        if (!isSupported) {
            this._log('Chain validation FAILED: Current chain is not supported.');
                } else {
            this._log('Chain validation SUCCESSFUL.');
                }
        // DO NOT update UI here. Let the calling context handle it.
        return isSupported;
    }

    updateConnectedUI() {
        this._log(`updateConnectedUI called. State: isConnected=${this.isConnected}, account=${this.account}, chain=${this.currentChain}`);
        const connectButtons = document.querySelectorAll('.wallet-connect-btn');
        const networkSelectors = document.querySelectorAll('.network-selector');
        
        const isChainSupported = this.currentChain && Object.values(SUPPORTED_CHAINS).some(chain => chain.chainId === this.currentChain);

        // Update connect buttons
        connectButtons.forEach(button => {
            if (this.isConnected) {
                if (isChainSupported) {
                    button.innerHTML = `Connected: ${this.account.substring(0, 6)}...${this.account.substring(38)}`;
                    button.classList.add('connected');
                    button.classList.remove('wrong-network');
                } else {
                    button.innerHTML = 'Wrong Network';
                    button.classList.remove('connected');
                    button.classList.add('wrong-network');
                }
            } else {
                button.innerHTML = 'Connect Wallet';
                button.classList.remove('connected', 'wrong-network');
            }
            button.disabled = false;
        });

        // Update network selectors
        networkSelectors.forEach(selector => {
            selector.disabled = !this.isConnected;
            if (this.isConnected && this.currentChain) {
                // Ensure the current chain exists as an option before setting value
                const optionExists = Array.from(selector.options).some(opt => opt.value === this.currentChain);
                if (optionExists) {
                    selector.value = this.currentChain;
                } else {
                     // Handle case where current chain is not in the dropdown (e.g., unsupported but connected)
                     // Maybe select the default disabled option
                     selector.value = ""; // Set to the default disabled option value
                }
            } else {
                selector.value = ""; // Set to the default disabled option value if not connected
            }
        });
        this._log('updateConnectedUI finished.');
    }

    async connectWallet() {
        this._log('connectWallet() called');
        if (typeof window.ethereum === 'undefined') {
            this._log('connectWallet failed: window.ethereum not found.');
            alert('Please install MetaMask.');
            return false;
        }

        try {
            this._log('Requesting accounts via eth_requestAccounts...');
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            // If the request is successful, the 'accountsChanged' event *should* fire.
            // We will rely on the event listener to handle the state update.
            if (accounts && accounts.length > 0) {
                 this._log('eth_requestAccounts successful. Waiting for accountsChanged event...');
                 // Removed manual calls: await this.handleAccountsChanged(accounts);
                 // Removed manual calls: const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                 // Removed manual calls: await this.handleChainChanged(chainId);
                 // The UI should update automatically when the event handlers fire.
                return true;
            } else {
                // This case might indicate an issue with the provider or an immediate disconnect
                this._log('eth_requestAccounts returned empty/null unexpectedly.');
                // Ensure state reflects disconnection
                await this.handleAccountsChanged([]); 
                return false;
            }
        } catch (error) {
            this._log(`connectWallet failed: ${error.message} (Code: ${error.code})`);
            if (error.code === 4001) { // User rejected
                alert('Connection request rejected.');
            } else {
                alert(`Failed to connect wallet: ${error.message}`);
            }
             // Ensure state reflects disconnection
            await this.handleAccountsChanged([]);
            return false;
        }
    }

    async switchChain(chainId) {
        this._log(`switchChain called for chainId: ${chainId}`);
        if (!this.isConnected) {
             this._log('Switch failed: Wallet not connected.');
             this.showNotification('Please connect your wallet first');
             return;
        }

        const targetChain = Object.values(SUPPORTED_CHAINS).find(chain => chain.chainId === chainId);
        if (!targetChain) {
            this._log(`Switch failed: Unsupported chainId ${chainId}`);
            this.showNotification('Selected network is not supported.');
            return;
        }

        if (this.currentChain === targetChain.chainId) {
            this._log('Switch skipped: Already on the target chain.');
            return;
        }

        this._log(`Attempting to switch to chain: ${targetChain.chainName} (${chainId})`);
        
        const networkSelectors = document.querySelectorAll('.network-selector');
        networkSelectors.forEach(selector => selector.disabled = true); // Disable UI temporarily

        try {
            this._log('Sending wallet_switchEthereumChain request...');
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: targetChain.chainId }],
            });
            this._log('wallet_switchEthereumChain request successful. Waiting for chainChanged event...');
            // Success: The 'chainChanged' event listener will handle the state and UI update.
        } catch (switchError) {
            this._log(`wallet_switchEthereumChain failed: ${switchError.message} (Code: ${switchError.code})`);
            if (switchError.code === 4902) { // Chain not added
                this._log('Chain not found, attempting wallet_addEthereumChain...');
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [SUPPORTED_CHAINS[Object.keys(SUPPORTED_CHAINS).find(key => SUPPORTED_CHAINS[key].chainId === chainId)]]
                    });
                    this._log('wallet_addEthereumChain request successful. Waiting for chainChanged event...');
                } catch (addError) {
                    this._log(`wallet_addEthereumChain failed: ${addError.message}`);
                    this.showNotification(`Failed to add ${targetChain.chainName} network.`);
                    networkSelectors.forEach(selector => selector.disabled = !this.isConnected); // Re-enable on error
                }
            } else if (switchError.code === 4001) { // User rejected switch
                 this._log('User rejected the network switch request.');
                 this.showNotification('Network switch cancelled.');
                 networkSelectors.forEach(selector => selector.disabled = !this.isConnected); // Re-enable
            } else { // Other errors
                this._log(`Failed to switch chain: ${switchError.message}`);
                this.showNotification(`Failed to switch to ${targetChain.chainName}.`);
                networkSelectors.forEach(selector => selector.disabled = !this.isConnected); // Re-enable
            }
        }
        // UI re-enabling is now primarily handled by updateConnectedUI triggered by chainChanged
        // We only explicitly re-enable here on specific error paths where chainChanged won't fire.
    }

    // --- Core Blockchain Interaction Methods --- 

    getTierTokenId(tier) {
        this._log(`getTierTokenId called for tier: ${tier}`);
        const tierIds = {
            'rookie': 1,
            'veteran': 2,
            'elite': 3,
            'master': 4,
            'legendary': 5
        };
        const tokenId = tierIds[tier.toLowerCase()] || 0;
        this._log(`Token ID for tier ${tier} is ${tokenId}`);
        return tokenId;
    }

    async checkNFTMinted(tier) {
        this._log(`checkNFTMinted called for tier: ${tier}`);
        if (!this.isConnected || !this.contract || !this.account) {
            this._log('checkNFTMinted skipped: Not connected or contract/account unavailable');
            return false;
        }

        const tokenId = this.getTierTokenId(tier);
        if (tokenId === 0) {
            this._log('checkNFTMinted failed: Invalid tier');
            return false; // Invalid tier
        }

        try {
            this._log(`Checking owner of tokenId ${tokenId}...`);
            const owner = await this.contract.methods.ownerOf(tokenId).call();
            this._log(`Owner of token ${tokenId} is ${owner}`);
            const isOwner = owner.toLowerCase() === this.account.toLowerCase();
            this._log(`Is current account (${this.account}) the owner? ${isOwner}`);
            return isOwner;
        } catch (error) {
            // Common error if token doesn't exist yet (ERC721NonexistentToken)
            if (error.message.includes('ERC721NonexistentToken') || error.message.includes('owner query for nonexistent token')) {
                this._log(`Token ${tokenId} does not exist yet.`);
            } else {
                this._log(`Error checking ownerOf token ${tokenId}: ${error.message}`);
            }
            return false;
        }
    }

    async mintNFT(tier) {
        this._log(`mintNFT called for tier: ${tier}`);
        if (!this.isConnected || !this.contract || !this.account) {
            this.showNotification('Please connect wallet and ensure you are on the correct network.');
            this._log('mintNFT failed: Not connected or contract/account unavailable.');
            throw new Error('Wallet not connected or contract unavailable');
        }

        const tokenId = this.getTierTokenId(tier);
        if (tokenId === 0) {
            this.showNotification('Invalid NFT tier selected.');
            this._log('mintNFT failed: Invalid tier resulting in tokenId 0.');
            throw new Error('Invalid NFT tier');
        }

        try {
            this._log('Checking if NFT already minted...');
            const alreadyMinted = await this.checkNFTMinted(tier);
            if (alreadyMinted) {
                this.showNotification('You have already minted this NFT tier.');
                this._log('mintNFT failed: NFT already minted by user.');
                throw new Error('NFT already minted');
            }

            this._log(`Preparing to mint NFT for tier ${tier} (tokenId ${tokenId}). Account: ${this.account}`);
            
            // Ensure account is available
             const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
             if (!accounts || accounts.length === 0 || accounts[0].toLowerCase() !== this.account.toLowerCase()) {
                 this._log('Account mismatch or unavailable after requestAccounts. Re-handling account state.');
                 await this.handleAccountsChanged(accounts || []); // Update state based on reality
                 if (!this.isConnected || !this.account) {
                      throw new Error('Wallet account became unavailable.');
                 }
             }
            
            this._log('Sending mintNFT transaction...');
            const result = await this.contract.methods.mintNFT(tokenId).send({ from: this.account });
            this._log(`Mint transaction successful: ${result.transactionHash}`);
            this.showNotification(`Successfully minted ${tier} NFT!`);

            // Optional: Update local user profile immediately
            // ... (add profile update logic if needed) ...

            return result; // Return transaction result
        } catch (error) {
            this._log(`mintNFT failed: ${error.message} (Code: ${error.code})`);
            if (error.code === 4001) { // User rejected
                this.showNotification('Mint transaction cancelled.');
            } else if (error.message.includes('already minted')) {
                 this.showNotification('NFT already minted.'); // Handle contract-side checks
            } else {
                this.showNotification('NFT minting failed. See console for details.');
            }
            throw error; // Re-throw the error for the caller to handle
        }
    }
    
    async performDailyCheckIn() {
        this._log('performDailyCheckIn called');
        if (!this.isConnected || !this.contract || !this.account) {
            this.showNotification('Please connect wallet and ensure you are on the correct network.');
             this._log('performDailyCheckIn failed: Not connected or contract/account unavailable.');
            throw new Error('Wallet not connected or contract unavailable');
        }

        // Optional: Add a client-side check for timing if desired, 
        // but the contract should be the source of truth.
        // const lastCheckIn = await this.getLastCheckIn(); // Needs implementation if used client-side
        // if (lastCheckIn && isToday(lastCheckIn)) { ... }

        try {
            this._log('Sending dailyCheckIn transaction...');
            const result = await this.contract.methods.dailyCheckIn().send({ from: this.account });
            this._log(`Daily check-in transaction successful: ${result.transactionHash}`);
            this.showNotification('Daily check-in successful! +500 XP added.');

            // Trigger XP update locally (assuming userProfile integration)
            if (window.userProfile && typeof window.userProfile.addXP === 'function') {
                window.userProfile.addXP(500); // Add 500 XP for check-in
                this._log('Updated local user profile with 500 XP.');
                // Dispatch event for UI updates
                window.dispatchEvent(new CustomEvent('xpUpdated', {
                    detail: { gained: 500 }
                }));
            } else {
                this._log('window.userProfile or addXP function not found for local XP update.');
            }

            return result; // Return transaction result
        } catch (error) {
            this._log(`performDailyCheckIn failed: ${error.message} (Code: ${error.code})`);
            if (error.code === 4001) { // User rejected
                this.showNotification('Daily check-in transaction cancelled.');
            } else if (error.message.includes('already checked in')) { // Check for contract error message
                 this.showNotification('You have already checked in today.');
            } else {
                this.showNotification('Daily check-in failed. See console for details.');
            }
            throw error; // Re-throw the error
        }
    }

    // Add other potentially missing methods like achievement/badge handling if needed...

    async mintAchievementBadge(achievementId) {
        this._log(`mintAchievementBadge called for achievementId: ${achievementId}`);
        if (!this.isConnected || !this.contract || !this.account) {
            this.showNotification('Please connect wallet and ensure you are on the correct network.');
            this._log('mintAchievementBadge failed: Not connected or contract/account unavailable.');
            throw new Error('Wallet not connected or contract unavailable');
        }

        // Map numeric IDs to achievement strings
        const achievementMap = {
            1: 'FIRST_BLOOD',
            2: 'VEHICULAR_MANSLAUGHTER',
            3: 'DESTRUCTION_DERBY',
            4: 'PRECISION',
            5: 'ROAD_WARRIOR',
            6: 'HIGHWAY_TO_HELL',
            7: 'DEATH_ALLEY_MASTER',
            8: 'FULL_THROTTLE',
            9: 'SPEED_DEMON',
            10: 'CHECKPOINT_HUNTER'
        };

        // Convert numeric ID to string ID
        const achievementString = achievementMap[achievementId];
        if (!achievementString) {
            this._log(`mintAchievementBadge failed: Invalid achievementId (${achievementId})`);
            this.showNotification('Invalid achievement ID provided.');
            throw new Error('Invalid achievement ID');
        }

        try {
            this._log(`Checking if badge ${achievementString} already minted by ${this.account}...`);
            const alreadyMinted = await this.contract.methods.hasMinted(this.account, achievementString).call();
            if (alreadyMinted) {
                this._log(`Badge ${achievementString} already minted according to contract.`);
                this.showNotification('You have already minted this achievement badge.');
                throw new Error('Achievement badge already minted');
            }
            this._log('Badge not yet minted according to contract. Proceeding...');

            // Check if achievement is registered
            try {
                const badgeInfo = await this.contract.methods.achievementBadges(achievementString).call();
                if (!badgeInfo || !badgeInfo.uri || badgeInfo.uri.length === 0) {
                    this._log(`mintAchievementBadge failed: Badge ${achievementString} not registered in contract.`);
                    this.showNotification('Achievement badge not registered in contract.');
                    throw new Error('Achievement badge not registered');
                }
                this._log(`Badge ${achievementString} confirmed registered in contract.`);
            } catch (badgeCheckError) {
                this._log(`Error checking badge registration: ${badgeCheckError.message}`);
                this.showNotification('Warning: Could not confirm badge registration.');
            }

            this._log(`Sending mintAchievementBadge transaction for ${achievementString}...`);
            const result = await this.contract.methods.mintAchievementBadge(achievementString).send({ from: this.account });
            this._log(`mintAchievementBadge transaction successful: ${result.transactionHash}`);
            this.showNotification('Achievement badge minted successfully!');

            return result;
        } catch (error) {
            this._log(`mintAchievementBadge failed: ${error.message}`);
            if (error.code === 4001) {
                this.showNotification('Mint transaction cancelled.');
            } else if (error.message.includes('Already minted')) {
                this.showNotification('You have already minted this achievement badge.');
            } else {
                this.showNotification('Achievement minting failed. See console for details.');
            }
            throw error;
        }
    }

    async getLastCheckIn() {
        this._log('getLastCheckIn called');
        if (!this.isConnected || !this.contract || !this.account) {
            this._log('getLastCheckIn skipped: Not connected or contract/account unavailable');
            return null;
        }

        try {
            this._log(`Calling getCheckInStatus for account ${this.account}...`);
            // Call the contract's view function
            const checkInStatus = await this.contract.methods.getCheckInStatus(this.account).call();
            this._log(`getCheckInStatus returned: ${JSON.stringify(checkInStatus)}`);

            // Extract the lastCheckIn timestamp (it's a BigInt string usually)
            const timestampBigInt = BigInt(checkInStatus.lastCheckIn);

            if (timestampBigInt === 0n) {
                this._log('No check-in recorded yet (timestamp is 0).');
                return null; // No check-in recorded
            }

            // Convert Unix timestamp (seconds) to JavaScript Date object (milliseconds)
            const lastCheckInDate = new Date(Number(timestampBigInt * 1000n)); 
            this._log(`Converted last check-in timestamp to Date: ${lastCheckInDate}`);
            return lastCheckInDate;
            
        } catch (error) {
            this._log(`Error in getLastCheckIn: ${error.message}`);
            // Handle potential errors, e.g., contract call reverts
            return null;
        }
    }

    async getMintedTiers() {
        this._log('getMintedTiers called');
        if (!this.isConnected || !this.contract || !this.account) {
            this._log('getMintedTiers skipped: Not connected or contract/account unavailable');
            return [];
        }

        const tiers = ['rookie', 'veteran', 'elite', 'master', 'legendary'];
        const mintedTiers = [];
        this._log(`Checking minted status for tiers: ${tiers.join(', ')}`);

        // We use Promise.all to check tiers concurrently for efficiency
        const checkPromises = tiers.map(async (tier) => {
            try {
                const isMinted = await this.checkNFTMinted(tier); // Use the existing check function
                if (isMinted) {
                    return tier; // Return the tier name if minted
                }
        } catch (error) {
                 this._log(`Error checking minted status for tier ${tier}: ${error.message}`);
                 // Decide if you want to halt or just skip this tier on error
            }
            return null; // Return null if not minted or error occurred
        });

        const results = await Promise.all(checkPromises);
        
        // Filter out null results to get the list of minted tiers
        const finalMintedTiers = results.filter(tier => tier !== null);
        this._log(`Minted tiers found: ${finalMintedTiers.join(', ') || 'None'}`);
        return finalMintedTiers;
    }

    // Helper method to show notifications (ensure it exists)
    showNotification(message) {
        this._log(`Notification: ${message}`);
        // Dispatch a notification event or use a library
        const event = new CustomEvent('notification', {
            detail: {
                message: message,
                type: 'info', // Or use different types like 'success', 'error'
                duration: 3000
            }
        });
        window.dispatchEvent(event);
    }
}

// Make BlockchainManager globally available
console.log('Making BlockchainManager globally available');
window.BlockchainManager = BlockchainManager;