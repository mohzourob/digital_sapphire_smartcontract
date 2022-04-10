// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// security against transactions for multiple requests
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./NFT.sol";


contract DigitalSapphireMarket is ReentrancyGuard, Ownable {
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
    uint256 private _contractFee;
    
    mapping(uint256 => NFTItem) private _marketItems;
    mapping(address => mapping(uint256 =>  NFTItem)) private _ownerToHisTokens;


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
        uint256 oldPrice,
        uint256 newPrice
    );

    event ItemBurn (
        uint256 indexed itemId,
        uint256 indexed tokenId
    );


    constructor(){
        // 250 basic points = 2.5 pct
        _contractFee = 250;
    }

    // get fee value
    function getFeeValue() public view returns(uint256){
        return _contractFee;
    }

    // change fee value
    function newFeeValue(uint256 _newFee) public onlyOwner {
        require(_newFee < 1000, "Check value of fee!");
        require(_newFee > 100, "Check value of fee!");

        _contractFee = _newFee;
    }

    // get fee for eth amount by wei
    function getFeeValueForAmountofWei(uint256 _amountOfWei) public view returns(uint256){
        return _amountOfWei * _contractFee / 10000;
    }

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
        require(
            NFT(_marketItems[itemId].nftContract).ownerOf(_marketItems[itemId].tokenId) == _marketItems[itemId].owner, 
            "UnAuthorized!"
        );

        uint256 oldPrice = _marketItems[itemId].price;
        _marketItems[itemId].price = price;
        _ownerToHisTokens[msg.sender][itemId].price = price;

        emit PriceUpdated(itemId, _marketItems[itemId].tokenId, oldPrice, price);
    }

    function burnItem(uint256 itemId) public{
        require(
            NFT(_marketItems[itemId].nftContract).ownerOf(_marketItems[itemId].tokenId) == _marketItems[itemId].owner, 
            "UnAuthorized!"
        );

        uint256 tokenId = _marketItems[itemId].tokenId;
        delete _marketItems[itemId];
        delete  _ownerToHisTokens[msg.sender][itemId];

        // burn token using call burnToken function by call NFT contract.
        NFT(_marketItems[itemId].nftContract).burnToken(tokenId);
        
        emit ItemBurn(itemId, tokenId);
    }

    
    function buyItem(uint256 itemId) public payable nonReentrant{
        require(msg.value == _marketItems[itemId].price, "Please submit asking price in order to countinue");
        require(_marketItems[itemId].sold == false, "Item already sold");

        // take fee from value
        uint256 feeValue = getFeeValueForAmountofWei(msg.value);

        // send fee to the owner
        payable(owner()).transfer(feeValue);

        // transfer the amount to the seller
        _marketItems[itemId].owner.transfer(msg.value - feeValue);

        // transfer the amount from contract address to the buyer
        IERC721(_marketItems[itemId].nftContract).transferFrom(address(this), msg.sender, _marketItems[itemId].tokenId);


        // change contract values
        address payable seller = _marketItems[itemId].owner;
        _marketItems[itemId].seller = seller;
        _marketItems[itemId].owner = payable(msg.sender);
        _marketItems[itemId].sold = true;
        _tokensSold.increment();
    }
}