// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// security against transactions for multiple requests
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


contract Owner {
    address private owner;
    event NewOwnerSet(address indexed oldOwer, address indexed newOwner);

    constructor(){
        owner = msg.sender;
        emit NewOwnerSet(address(0), owner);
    }

    modifier isOwner() {
        require(msg.sender == owner, "Not authorized!");
        _;
    }

    function getOwner() external view returns(address) {
        return owner;
    }


    function setNewOwner(address _newOwner) public isOwner returns(bool){
        require(owner != address(0), "Invalid Address!");
        emit NewOwnerSet(owner, _newOwner);
        owner = _newOwner;
        return true;
    }
}

contract DigitalSapphireMarket is ReentrancyGuard {
    using Counters for Counters.Counter;
    using SafeMath for uint256;

    // market item
    struct NFTItem {
        address nftContract;
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
    }

    Counters.Counter private _tokenIds;
    Counters.Counter private _tokensSold;
    
    mapping(uint256 => NFTItem) _marketItems;
    mapping(address => mapping(uint256 =>  NFTItem)) private _ownerToHisTokens;
    mapping(uint256 => address) private _owners;

    event NewItemAdded(
        uint256 indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address owner,
        uint256 price,
        bool sold
    );

    event PriceUpdated(
        uint256 indexed itemId,
        uint256 indexed tokenId,
        uint256 price
    );


    constructor(){}

    // create item with out add this item to listing page with price.
    // nonReentrant is a modifier to prevent reentry attak.
    function createItem(address nftContract, uint256 tokenId, uint256 price) public nonReentrant {
        require(price > 0, "Price must be at least one wei");

        _tokenIds.increment();
        uint256 itemId = _tokenIds.current();

        _marketItems[itemId] = NFTItem(
            nftContract,
            tokenId,
            payable(address(0)),
            payable(msg.sender),
            price,
            false
        );

        _ownerToHisTokens[msg.sender][itemId] = NFTItem(
            nftContract,
            tokenId,
            payable(address(0)),
            payable(msg.sender),
            price,
            false
        );

        _owners[itemId] = msg.sender;

        // NFT transaction
        IERC721(nftContract).safeTransferFrom(msg.sender, address(this), tokenId);

        emit NewItemAdded(
            itemId,
            nftContract,
            tokenId,
            payable(address(0)),
            payable(msg.sender),
            price,
            false
        );
    }


    function updateItemPrice(uint256 itemId, uint256 price) public {
        require(price > 0, "Price must be at least one wei");
        require(_owners[itemId] == msg.sender, "UnAuthorized!");

        _marketItems[itemId].price = price;
        _ownerToHisTokens[msg.sender][itemId].price = price;

        emit PriceUpdated(itemId, _marketItems[itemId].tokenId, price);
    }

    function burnItem(uint256 itemId) public{
        require(_owners[itemId] == msg.sender, "UnAuthorized!");

        delete _marketItems[itemId];
        delete  _ownerToHisTokens[msg.sender][itemId];
    }
}



