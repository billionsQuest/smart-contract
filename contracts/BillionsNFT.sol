// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

import "./BattleContract.sol";

contract BillionsNFT is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;
    using Strings for address;
    using Counters for Counters.Counter;

    Counters.Counter private nftId;
    uint256 public totalSupply = 0;

    address public battleContractAddress;
    address public playTokenAddress;
    address public marketplaceAddress;

    address public aggregatorV3Address;
    uint256 public slippage = 1;

    uint256 public mintPrice = 3000000000000000000;
    uint256 public defaultRentPrice = 1 * 10 ** 18; // 10 PLAY TOKEN
    uint256 public defaultSellingPrice = 10 * 10 ** 18; // 10 PLAY TOKEN

    string public baseURI = "https://ipfs.io/ipfs/";
    uint256[] public rentableNftList;

    struct NFTInfo {
        uint256 nftId;
        string symbol;
        string searchName;
        bool rentable;
        address owner;
        uint256 rentPrice;
        uint256 sellingPrice;
    }
    mapping(address => bool) public isVerifiedAddress;
    mapping(uint256 => address) public previousOwner;
    mapping(string => bool) private usedSymbol;
    mapping(uint256 => NFTInfo) public nftInfos; // nftId => NFT
    mapping(address => uint256[]) public rentedNfts; // address => nftIds
    mapping(uint256 => mapping(uint256 => uint256)) public rentCount; // battle id => (nft id => count)
    mapping(uint256 => mapping(uint256 => mapping(address => bool)))
        public rentInfos; // battle id => (nft id => (address => state))

    event _BillionsNftMint(
        uint256 tokenId,
        string symbol,
        address indexed owner
    );
    event TransferWithSymbol(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId,
        string stockSymbol,
        string searchSymbol
    );
    event _Withdraw(address indexed owner, uint256 amount);
    event _UpdateRentalStatus(uint256 tokenId, uint256 price, bool isRental);
    event _RentNft(uint256 battleId, uint256[] tokenId, address indexed user);
    event _UpdateSellingPrice(uint256 tokenId, uint256 sellingPrice);

    constructor(
        string memory _name,
        string memory _symbol,
        address _playTokenAddress
    ) ERC721(_name, _symbol) {
        playTokenAddress = _playTokenAddress;
    }

    function mintByAdmin(
        string memory _symbol
    ) external onlyOwner returns (uint256) {
        require(!usedSymbol[_symbol], "not available");

        uint256 _nftId = nftId.current();
        nftId.increment();
        totalSupply += 1;

        _safeMint(msg.sender, _nftId);

        NFTInfo storage nftInfo = nftInfos[_nftId];
        nftInfo.nftId = _nftId;
        nftInfo.symbol = _symbol;
        nftInfo.rentable = false;
        nftInfo.rentPrice = defaultRentPrice;
        nftInfo.sellingPrice = defaultSellingPrice;
        nftInfo.owner = msg.sender;
        nftInfo.searchName = _symbol;

        usedSymbol[_symbol] = true;

        emit _BillionsNftMint(_nftId, _symbol, msg.sender);

        return _nftId;
    }

    function mint(
        address _to,
        string memory _symbol,
        string memory _searchName
    ) external nonReentrant returns (uint256) {
        require(!usedSymbol[_symbol], "not available");

        uint256 _nftId = nftId.current();
        nftId.increment();
        totalSupply += 1;

        _safeMint(_to, _nftId);
        emit TransferWithSymbol(
            msg.sender,
            address(0),
            _nftId,
            _symbol,
            _searchName
        );

        NFTInfo storage nftInfo = nftInfos[_nftId];
        nftInfo.nftId = _nftId;
        nftInfo.symbol = _symbol;
        nftInfo.rentable = false;
        nftInfo.rentPrice = defaultRentPrice;
        nftInfo.sellingPrice = defaultSellingPrice;
        nftInfo.owner = msg.sender;
        nftInfo.searchName = _searchName;

        usedSymbol[_symbol] = true;

        emit _BillionsNftMint(_nftId, _symbol, _to);

        return _nftId;
    }

    function setBaseURI(string memory _uri) external onlyOwner {
        baseURI = _uri;
    }

    function tokenURI(
        uint256 _nftId
    ) public view virtual override returns (string memory uri) {
        _requireMinted(_nftId);

        uri = bytes(baseURI).length > 0
            ? string(abi.encodePacked(baseURI, nftInfos[_nftId].symbol))
            : "";
    }

    function setMintPrice(uint256 _price) external onlyOwner {
        mintPrice = _price;
    }

    function updateNftRentingStatus(
        uint256 _tokenId,
        uint256 _rentprice,
        bool status
    ) external nonReentrant {
        if (ownerOf(_tokenId) == marketplaceAddress) {
            require(
                msg.sender == previousOwner[_tokenId],
                "only nft owner can edit"
            );
        } else {
            require(msg.sender == ownerOf(_tokenId), "only nft owner can edit");
        }

        NFTInfo storage nftInfo = nftInfos[_tokenId];

        nftInfo.rentPrice = _rentprice;
        nftInfo.rentable = status;

        emit _UpdateRentalStatus(_tokenId, _rentprice, nftInfo.rentable);
    }

    function updateSellingPrice(
        uint256 _tokenId,
        uint256 _newSellingPrice
    ) external nonReentrant {
        if (ownerOf(_tokenId) == marketplaceAddress) {
            require(
                msg.sender == previousOwner[_tokenId],
                "only nft owner can edit"
            );
        } else {
            require(msg.sender == ownerOf(_tokenId), "only nft owner can edit");
        }

        NFTInfo storage nftInfo = nftInfos[_tokenId];
        nftInfo.sellingPrice = _newSellingPrice;

        emit _UpdateSellingPrice(_tokenId, _newSellingPrice);
    }

    function setBattleContractAddress(
        address _newBattleContractAddress
    ) external onlyOwner {
        battleContractAddress = _newBattleContractAddress;
    }

    function setPlayTokenAddress(
        address _newPlayTokenAddress
    ) external onlyOwner {
        playTokenAddress = _newPlayTokenAddress;
    }

    function setMarketplaceAddress(
        address _newMarketplaceAddress
    ) external onlyOwner {
        marketplaceAddress = _newMarketplaceAddress;
    }

    function rentAnNft(uint256 _battleId, uint256[] memory _tokenIds) external {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            uint256 tokenId = _tokenIds[i];
            require(_exists(tokenId), "token id not exist");

            NFTInfo memory nftInfo = nftInfos[tokenId];
            require(nftInfo.rentable, "token is not available for rent");

            IERC20 payToken = IERC20(playTokenAddress);
            require(
                payToken.transferFrom(
                    _msgSender(),
                    nftInfo.owner,
                    nftInfo.rentPrice
                ),
                "must pay token for rent"
            );

            rentInfos[_battleId][tokenId][msg.sender] = true;
        }

        emit _RentNft(_battleId, _tokenIds, msg.sender);
    }

    function getOwner(uint256 _tokenId) external view returns (address) {
        return ownerOf(_tokenId);
    }

    function isRenter(
        uint256 _bttleId,
        uint256 _nftId,
        address _addr
    ) external view returns (bool) {
        return rentInfos[_bttleId][_nftId][_addr];
    }

    function setSlippage(uint256 _slippage) external onlyOwner {
        slippage = _slippage;
    }

    function setDefaultRentPrice(uint256 _newRentPrice) external onlyOwner {
        defaultRentPrice = _newRentPrice;
    }

    function setDefaultSellingPrice(
        uint256 _newSellingPrice
    ) external onlyOwner {
        defaultSellingPrice = _newSellingPrice;
    }

    function updatePreviousOwner(
        uint256 _tokenId,
        address _previousOwner
    ) external {
        previousOwner[_tokenId] = _previousOwner;
    }

    function WithdrawERC20(uint256 _amount) external onlyOwner nonReentrant {
        IERC20 payToken = IERC20(playTokenAddress);

        uint256 _balance = payToken.balanceOf(address(this));
        require(_balance >= _amount, "no enough wallet");

        payToken.transfer(_msgSender(), _amount);

        emit _Withdraw(_msgSender(), _amount);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override {
        NFTInfo storage nftInfo = nftInfos[tokenId];

        nftInfo.owner = to;
    }
}
