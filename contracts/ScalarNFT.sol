//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ScalarNFT is ERC721, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private nftId;
    uint256 public totalSupply = 0;
    uint256 private nonce = 0;
    string[] private scalarPositiveValues = [
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10"
    ];
    string[] private scalarNegativeValues = [
        "-2",
        "-3",
        "-4",
        "-5",
        "-6",
        "-7",
        "-8",
        "-9",
        "-10"
    ];

    string private baseURI = "https://ipfs.io/billions/scalar/";

    uint256 public mintPrice = 1 * 10 ** 18;

    address public payTokenAddress;

    mapping(uint256 => bool) private isMinted;
    mapping(uint256 => string) public scalarValueOfId;
    mapping(address => uint256[]) public scalarIdsOfPlayer;

    event MintNft(uint256 tokenId, address indexed user, string scalarValue);

    constructor(address _plyTokenAddress) ERC721("Billions Scalar NFT", "BSN") {
        payTokenAddress = _plyTokenAddress;
    }

    /**
     * @notice Mint the scalar Nfts by spending ERC20 token
     * @return id returns the minted token id
     */
    function mint() external nonReentrant returns (uint256) {
        IERC20 payToken = IERC20(payTokenAddress);
        require(
            payToken.transferFrom(msg.sender, address(this), mintPrice),
            "must pay token"
        );

        uint256 id = nftId.current();
        nftId.increment();

        _mint(msg.sender, id);
        totalSupply += 1;
        scalarIdsOfPlayer[msg.sender].push(id);

        uint256 reqId = getRandomNumber();
        string memory selectedValue;

        if (reqId < scalarPositiveValues.length) {
            selectedValue = scalarPositiveValues[reqId];
        } else {
            selectedValue = scalarNegativeValues[
                reqId - scalarPositiveValues.length
            ];
        }

        scalarValueOfId[id] = selectedValue;
        isMinted[id] = true;

        emit MintNft(id, msg.sender, selectedValue);

        return id;
    }

    /**
     * @notice Mint the scalar Nfts by spending ERC20 token
     * @param _to Address of the owner
     * @return id returns the minted token id
     */
    function mintForReward(address _to) external returns (uint256) {
        uint256 id = nftId.current();
        nftId.increment();

        _mint(_to, id);
        totalSupply += 1;
        scalarIdsOfPlayer[_to].push(id);

        uint256 reqId = getRandomNumber();
        string memory selectedValue;

        if (reqId < scalarPositiveValues.length) {
            selectedValue = scalarPositiveValues[reqId];
        } else {
            selectedValue = scalarNegativeValues[
                reqId - scalarPositiveValues.length
            ];
        }

        scalarValueOfId[id] = selectedValue;
        isMinted[id] = true;

        emit MintNft(id, _to, selectedValue);

        return id;
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        require(!isMinted[tokenId], "Transfer not allowed for minted tokens");
        super.transferFrom(from, to, tokenId);
    }

    function getRandomNumber() internal returns (uint256) {
        nonce++;
        uint256 randomSeed = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.difficulty,
                    msg.sender,
                    nonce
                )
            )
        );
        int256 maxRange = int256(scalarPositiveValues.length) +
            int256(scalarNegativeValues.length);
        return uint256(randomSeed % uint256(maxRange));
    }

    function setPayTokenAddress(address _addr) external onlyOwner {
        payTokenAddress = _addr;
    }

    /**
     * store the price to mint(USDC)
     */
    function setMintPrice(uint256 _price) external onlyOwner {
        mintPrice = _price;
    }

    function withdrawTokens(uint256 amount) public onlyOwner {
        IERC20 payToken = IERC20(payTokenAddress);

        // Ensure that the contract has enough tokens to withdraw
        require(
            payToken.balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );

        // Transfer tokens to the owner's address
        payToken.transfer(owner(), amount);
    }

    /**
     * return the type and value of '_nftId' scalar nft
     */
    function getScalar(
        uint256 _nftId
    ) external view returns (string memory sValue) {
        if (_exists(_nftId)) {
            sValue = scalarValueOfId[_nftId];
        } else {
            return "";
        }
    }

    /**
     * store base of uri of ipfs for scalar nfts
     */
    function setBaseURI(string memory _uri) external onlyOwner {
        baseURI = _uri;
    }

    function addScalarPositiveValue(string memory value) external onlyOwner {
        scalarPositiveValues.push(value);
    }

    function removeScalarPositiveValue(string memory value) external onlyOwner {
        for (uint256 i = 0; i < scalarPositiveValues.length; i++) {
            if (
                keccak256(bytes(scalarPositiveValues[i])) ==
                keccak256(bytes(value))
            ) {
                if (i < scalarPositiveValues.length - 1) {
                    scalarPositiveValues[i] = scalarPositiveValues[
                        scalarPositiveValues.length - 1
                    ];
                }
                scalarPositiveValues.pop();
                break;
            }
        }
    }

    function addScalarNegativeValue(string memory value) external onlyOwner {
        scalarNegativeValues.push(value);
    }

    function removeScalarNegativeValue(string memory value) external onlyOwner {
        for (uint256 i = 0; i < scalarNegativeValues.length; i++) {
            if (
                keccak256(bytes(scalarNegativeValues[i])) ==
                keccak256(bytes(value))
            ) {
                if (i < scalarNegativeValues.length - 1) {
                    scalarNegativeValues[i] = scalarNegativeValues[
                        scalarNegativeValues.length - 1
                    ];
                }
                scalarNegativeValues.pop();
                break;
            }
        }
    }

    /**
     * @dev Burn an existing NFT.
     * @param tokenId The ID of the NFT to be burned.
     */
    function burn(uint256 tokenId) external {
        require(
            _isApprovedOrOwner(msg.sender, tokenId),
            "Not approved or owner"
        );
        _burn(tokenId);
    }

    /**
     * @dev Get the Owner NFT.
     * @param _tokenId The Token ID of the NFT.
     * @return Returns the owner of the NFT.
     */
    function getOwner(uint256 _tokenId) external view returns (address) {
        return ownerOf(_tokenId);
    }

    /**
     * return base of uri of ipfs for scalar nfts
     */
    function getBaseURI() external view returns (string memory) {
        return baseURI;
    }

    /**
     * return scalar info(scalarType, sclarValue) that '_user' player own
     */
    function getScalarsOfPlayer(
        address _user
    ) external view returns (string[] memory) {
        uint256[] memory scalarIds = scalarIdsOfPlayer[_user];
        uint256 count = scalarIds.length;
        string[] memory scalarInfos = new string[](count);

        for (uint256 i = 0; i < count; i++) {
            scalarInfos[i] = scalarValueOfId[scalarIds[i]];
        }

        return scalarInfos;
    }

    /**
     * return scalar ids that '_user' player own
     */
    function getScalarIdsOfPlayer(
        address _user
    ) external view returns (uint256[] memory) {
        return scalarIdsOfPlayer[_user];
    }
}
