// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "./BillionsNFT.sol";
import "./ScalarNFT.sol";

contract MarketPlaceContract is Ownable {
    using SafeMath for uint256;

    address public billionsNftAddress;
    address public scalarNftAddress;
    address public PLYTokenAddress;
    address public USDTTokenAddress;
    BillionsNFT internal billionsNftAsset;
    ScalarNFT internal scalarNftAsset;
    uint256 public AuctionId = 0;
    uint256 BaseMintPrice = 10 * 10 ** 18;
    uint256 RewardPrice = 10 * 10 ** 18; // 10 PLY Token
    uint256 AdminFee = 250; // 2.5%

    enum AuctionStatus {
        PENDING,
        FINISHED,
        CANCELLED
    }

    struct AuctionInfo {
        uint256 tokenId;
        string symbol;
        string searchName;
        uint256 miniumBidAmount;
        address currentBidWinner;
        uint256 currentBidAmount;
        uint256 startTime;
        uint256 auctionEndTime;
        bool isAuction;
        AuctionStatus status;
        address nftOwner;
        address[] bidders;
        mapping(address => uint256) pendingAmount;
        mapping(address => bool) isBidded;
    }

    mapping(uint256 => AuctionInfo) public auctions;
    mapping(address => uint256[]) public userBidInfo; //user address => auction ids.
    mapping(string => bool) public symbolUsed;

    event _CreateAuction(
        uint8[] _auctionIds,
        string[] _symbol,
        string[] _symbolName,
        uint256 _minBidAmount,
        uint256 _endTime,
        address indexed owner
    );
    event _CreateFixedSale(
        uint256 _auctionId,
        uint256 _tokenId,
        uint256 _price,
        address indexed owner
    );
    event _DeleteMarketItem(uint256 auctionId);
    event _Bid(uint256 _auctionId, address indexed bidder, uint256 bidAmount);
    event _CancelBid(uint256 _auctionId, address indexed bidder);
    event _Buy(uint256 _auctionId, address indexed buyer);
    event _CancelFixedSale(uint256 _auctionId);
    event _Accept(uint256 _auctionId, address indexed owner);
    event _Claim(uint256 _auctionid, uint256 tokenId, address indexed owner);

    modifier notEnded(uint256 _auctionId) {
        AuctionInfo storage _auction = auctions[_auctionId];
        require(
            _auction.auctionEndTime > block.timestamp &&
                _auction.status != AuctionStatus.FINISHED &&
                _auction.isAuction,
            "not avaiable to bid"
        );
        _;
    }

    constructor(
        address _billionsNftAddress,
        address _scalarNftAddress,
        address _PLYTokenAddress,
        address _USDTTokenAddress
    ) {
        //ERC20 Token Addresses
        PLYTokenAddress = _PLYTokenAddress;
        USDTTokenAddress = _USDTTokenAddress;

        //ERC721 Token Addresses
        scalarNftAddress = _scalarNftAddress;
        billionsNftAddress = _billionsNftAddress;

        // NFT Address Initialization
        billionsNftAsset = BillionsNFT(_billionsNftAddress);
        scalarNftAsset = ScalarNFT(_scalarNftAddress);
    }

    /**
     * @dev Create an auction for multiple symbols.
     * @param _symbol Array of symbols to be auctioned.
     * @param _minBidAmount Minimum bid amount required for the auction.
     * @param endTime End time of the auction.
     */
    function createAuction(
        string[] memory _symbol,
        string[] memory _symbolName,
        uint256 _minBidAmount,
        uint256 endTime
    ) external onlyOwner {
        uint8[] memory currentAuctionIdList = new uint8[](_symbol.length);

        for (uint256 i = 0; i < _symbol.length; i++) {
            string memory symbol = _symbol[i];
            string memory symbolsearch = _symbolName[i];

            require(!symbolUsed[symbol], "This stock is already in use");

            uint256 currentAuctionId = AuctionId;
            currentAuctionIdList[i] = uint8(currentAuctionId);
            AuctionId += 1;

            symbolUsed[symbol] = true;
            AuctionInfo storage _auction = auctions[currentAuctionId];

            _auction.symbol = symbol;
            _auction.searchName = symbolsearch;
            _auction.isAuction = true;
            _auction.startTime = block.timestamp;
            _auction.auctionEndTime = endTime;
            _auction.miniumBidAmount = _minBidAmount;
            _auction.currentBidAmount = _minBidAmount;
            _auction.currentBidWinner = msg.sender;
            _auction.nftOwner = msg.sender;
            _auction.status = AuctionStatus.PENDING;
        }

        emit _CreateAuction(
            currentAuctionIdList,
            _symbol,
            _symbolName,
            _minBidAmount,
            endTime,
            msg.sender
        );
    }

    /**
     * @dev Create a fixed price sale for an NFT.
     * @param _tokenId ID of the NFT to be sold.
     * @param _price Fixed price for the NFT.
     */
    function createFixedSale(uint256 _tokenId, uint256 _price) external {
        require(
            msg.sender == billionsNftAsset.ownerOf(_tokenId),
            "only nft owner"
        );

        uint256 currentAuctionId = AuctionId;
        AuctionId += 1;

        billionsNftAsset.transferFrom(msg.sender, address(this), _tokenId);

        AuctionInfo storage _auction = auctions[currentAuctionId];

        _auction.isAuction = false;
        _auction.currentBidAmount = _price;
        _auction.currentBidWinner = address(0);
        _auction.nftOwner = msg.sender;
        _auction.status = AuctionStatus.PENDING;
        _auction.tokenId = _tokenId;

        billionsNftAsset.updatePreviousOwner(_tokenId, msg.sender);

        emit _CreateFixedSale(currentAuctionId, _tokenId, _price, msg.sender);
    }

    /**
     * @dev Place a bid on an active auction.
     * @param _auctionId ID of the auction to bid on.
     * @param bidAmount Amount of bid to place.
     */
    function bidOnAuction(
        uint256 _auctionId,
        uint256 bidAmount
    ) external notEnded(_auctionId) {
        require(_auctionId < AuctionId, "auction id is not exist");
        AuctionInfo storage _auction = auctions[_auctionId];

        require(
            bidAmount > _auction.currentBidAmount,
            "Bid amount must be greater than the current bid amount"
        );
        require(
            bidAmount >= (_auction.currentBidAmount + 50 * 10 ** 16),
            "Bid amount must be at least 50 cents greater than the current bid"
        );

        IERC20 paytoken = IERC20(USDTTokenAddress);

        uint256 pendingAmount = _auction.pendingAmount[msg.sender];

        if (pendingAmount != 0) {
            require(
                paytoken.transfer(msg.sender, pendingAmount),
                "Token transfer failed"
            );
        }

        if (!_auction.isBidded[msg.sender]) {
            _auction.isBidded[msg.sender] = true;
            _auction.bidders.push(msg.sender);
        }

        paytoken.transferFrom(msg.sender, address(this), bidAmount);

        _auction.currentBidAmount = bidAmount;
        _auction.currentBidWinner = msg.sender;
        _auction.pendingAmount[msg.sender] = bidAmount;
        userBidInfo[msg.sender].push(_auctionId);

        emit _Bid(_auctionId, msg.sender, bidAmount);
    }

    /**
     * @dev Buy an NFT instantly in a fixed price sale.
     * @param _auctionId ID of the auction to buy from.
     */
    function buyOnFixedSale(uint256 _auctionId) external {
        require(_auctionId < AuctionId, "auction id is not exist");

        AuctionInfo storage _auction = auctions[_auctionId];
        require(!_auction.isAuction, "is not available to instantly buy");
        require(
            _auction.status == AuctionStatus.PENDING,
            "is not available to buy"
        );

        _auction.status = AuctionStatus.FINISHED;
        uint256 fee = _auction.currentBidAmount.mul(AdminFee).div(10000);

        IERC20(PLYTokenAddress).transferFrom(msg.sender, owner(), fee);
        IERC20(PLYTokenAddress).transferFrom(
            msg.sender,
            _auction.nftOwner,
            _auction.currentBidAmount.sub(fee)
        );
        billionsNftAsset.safeTransferFrom(
            address(this),
            msg.sender,
            _auction.tokenId
        );

        emit _Buy(_auctionId, msg.sender);
    }

    /**
     * @dev Cancel an NFT from a fixed sale.
     * @param _auctionId ID of the auction to cancel the sale.
     */
    function cancelFixedSale(uint256 _auctionId) external {
        require(_auctionId < AuctionId, "auction id is not exist");

        AuctionInfo storage _auction = auctions[_auctionId];
        require(_auction.nftOwner == msg.sender, "only owner can cancel");
        require(!_auction.isAuction, "cannot cancel auction");

        _auction.status = AuctionStatus.CANCELLED;
        billionsNftAsset.safeTransferFrom(
            address(this),
            _auction.nftOwner,
            _auction.tokenId
        );

        emit _CancelFixedSale(_auctionId);
    }

    /**
     * @dev Distribute the NFT to the auction winner and handle refunds for other bidders.
     * @param _auctionId ID of the auction to distribute.
     */
    function distributeNft(uint256 _auctionId) external onlyOwner {
        AuctionInfo storage _auction = auctions[_auctionId];

        require(
            _auction.status == AuctionStatus.PENDING ||
                _auction.auctionEndTime < block.timestamp,
            "Auction is not finished yet"
        );
        require(_auction.isAuction, "Not an auction item");

        _auction.status = AuctionStatus.FINISHED;

        if (_auction.bidders.length == 0) {
            uint256 tokenId = billionsNftAsset.mint(
                _auction.nftOwner,
                _auction.symbol,
                _auction.searchName
            );
            emit _Claim(_auctionId, tokenId, _auction.nftOwner);
        } else {
            uint256 tokenId = billionsNftAsset.mint(
                _auction.currentBidWinner,
                _auction.symbol,
                _auction.searchName
            );
            scalarNftAsset.mintForReward(_auction.currentBidWinner);
            IERC20(PLYTokenAddress).transfer(_auction.nftOwner, RewardPrice);

            // Distribute tokens to other participants who lost the auction
            for (uint256 i = 0; i < _auction.bidders.length; i++) {
                address bidder = _auction.bidders[i];
                if (bidder != _auction.currentBidWinner) {
                    uint256 returnedAmount = _auction.pendingAmount[bidder];
                    IERC20(USDTTokenAddress).transfer(bidder, returnedAmount);
                }
            }

            emit _Claim(_auctionId, tokenId, _auction.currentBidWinner);
        }
    }

    function distributeAllNfts(uint256[] memory auctionIds) external onlyOwner {
        for (uint256 i = 0; i < auctionIds.length; i++) {
            AuctionInfo storage _auction = auctions[auctionIds[i]];

            require(
                _auction.status == AuctionStatus.PENDING ||
                    _auction.auctionEndTime < block.timestamp,
                "Auction is not finished yet"
            );
            require(_auction.isAuction, "Not an auction item");

            _auction.status = AuctionStatus.FINISHED;

            if (_auction.bidders.length == 0) {
                uint256 tokenId = billionsNftAsset.mint(
                    _auction.nftOwner,
                    _auction.symbol,
                    _auction.searchName
                );
                emit _Claim(auctionIds[i], tokenId, _auction.nftOwner);
            } else {
                uint256 tokenId = billionsNftAsset.mint(
                    _auction.currentBidWinner,
                    _auction.symbol,
                    _auction.searchName
                );
                scalarNftAsset.mintForReward(_auction.currentBidWinner);
                IERC20(PLYTokenAddress).transfer(
                    _auction.nftOwner,
                    RewardPrice
                );

                // Distribute tokens to other participants who lost the auction
                for (uint256 i = 0; i < _auction.bidders.length; i++) {
                    address bidder = _auction.bidders[i];
                    if (bidder != _auction.currentBidWinner) {
                        uint256 returnedAmount = _auction.pendingAmount[bidder];
                        IERC20(USDTTokenAddress).transfer(
                            bidder,
                            returnedAmount
                        );
                    }
                }

                emit _Claim(auctionIds[i], tokenId, _auction.currentBidWinner);
            }
        }
    }

    /**
     * @dev Claim the pending bid amount refunded to the bidder.
     * @param _auctionId ID of the auction to claim the pending amount from.
     */
    function claimPendingAmount(uint256 _auctionId) external {
        AuctionInfo storage _auction = auctions[_auctionId];
        require(
            _auction.pendingAmount[msg.sender] != 0,
            "is no avaialbe amount"
        );
        require(_auction.currentBidWinner != msg.sender, "winner cannot claim");

        uint256 _pendingAmount = _auction.pendingAmount[msg.sender];
        _auction.pendingAmount[msg.sender] = 0;

        IERC20(USDTTokenAddress).transfer(msg.sender, _pendingAmount);

        uint256 _count = userBidInfo[msg.sender].length;
        for (uint256 i = 0; i < _count; i++) {
            if (_auctionId == userBidInfo[msg.sender][i]) {
                userBidInfo[msg.sender][i] = userBidInfo[msg.sender][
                    _count - 1
                ];
                userBidInfo[msg.sender].pop();
            }
        }
    }

    /**
     * @dev Set the address of the BillionsNFT contract.
     * @param _billionsNftAddress Address of the BillionsNFT contract.
     */
    function setBillionsNftAddress(
        address _billionsNftAddress
    ) external onlyOwner {
        billionsNftAddress = _billionsNftAddress;
        billionsNftAsset = BillionsNFT(_billionsNftAddress);
    }

    /**
     * @dev Set the address of the ScalarNFT contract.
     * @param _scalarNftAddress Address of the ScalarNFT contract.
     */
    function setScalarNftAddress(address _scalarNftAddress) external onlyOwner {
        scalarNftAddress = _scalarNftAddress;
        scalarNftAsset = ScalarNFT(_scalarNftAddress);
    }

    /**
     * @dev Set the address of the USDTToken contract.
     * @param _usdtTokenAddress Address of the USDTToken contract.
     */
    function setUSDTTokenAddress(address _usdtTokenAddress) external onlyOwner {
        USDTTokenAddress = _usdtTokenAddress;
    }

    /**
     * @dev Set the address of the PLYToken contract.
     * @param _plyTokenAddress Address of the PLYToken contract.
     */
    function setPLYTokenAddress(address _plyTokenAddress) external onlyOwner {
        PLYTokenAddress = _plyTokenAddress;
    }

    /**
     * @dev Set the reward price for the auction winner.
     * @param _rewardPrice Reward price in PLY Tokens.
     */
    function setRewardPrice(uint256 _rewardPrice) external onlyOwner {
        RewardPrice = _rewardPrice;
    }

    /**
     * @dev Get the auction IDs for a user's bids.
     * @param userAddress Address of the user.
     * @return Array of auction IDs for the user's bids.
     */
    function getUserBidInfo(
        address userAddress
    ) external view returns (uint256[] memory) {
        return userBidInfo[userAddress];
    }

    /**
     * @dev Get detailed information about an auction.
     * @param _auctionId ID of the auction.
     */
    function getAuctionInfo(
        uint256 _auctionId
    )
        external
        view
        returns (
            uint256 tokenId,
            string memory symbol,
            uint256 miniumBidAmount,
            address currentBidWinner,
            uint256 currentBidAmount,
            uint256 auctionEndTime,
            bool isAuction,
            AuctionStatus status,
            address nftOwner,
            address[] memory bidders
        )
    {
        AuctionInfo storage auction = auctions[_auctionId];

        return (
            auction.tokenId,
            auction.symbol,
            auction.miniumBidAmount,
            auction.currentBidWinner,
            auction.currentBidAmount,
            auction.auctionEndTime,
            auction.isAuction,
            auction.status,
            auction.nftOwner,
            auction.bidders
        );
    }
}
