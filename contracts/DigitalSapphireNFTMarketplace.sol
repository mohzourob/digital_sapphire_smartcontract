// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
// security against transactions for multiple requests
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// import "hardhat/console.sol";

contract DigitalSapphireNFTMarketplace is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    using SafeMath for uint256;

    // counter to keep track of tokenIds
    Counters.Counter private _tokensCounter;

    using Counters for Counters.Counter;
    using SafeMath for uint256;

    // market item
    struct NFTItem {
        string tokenURI;
        uint256 itemId;
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
        bool _isDeleted;
    }

    Counters.Counter private _tokenIds;
    Counters.Counter private _tokensSold;
    uint256 private _contractFee;
    uint256 private _contractProfits;

    mapping(uint256 => NFTItem) private _marketItems;
    mapping(address => uint256[]) private _ownerToArrayOfTokens;
    mapping(address => uint256[]) private _ownerToArrayOfBoughtTokens;

    event NewItemAdded(
        string tokenURI,
        uint256 indexed itemId,
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

    event ItemBurn(uint256 indexed itemId, uint256 indexed tokenId);

    event purchaseDone(
        address indexed newOwner,
        uint256 indexed tokenId,
        uint256 price
    );

    constructor() ERC721("DigitalSapphireMarket", "DGSM") {
        // 250 basic points = 2.5 pct
        _contractFee = 250;
    }

    // fall back to recieve ether directly to this contract when has body msg
    fallback() external payable {}

    // recieve ether directly when does not body msg
    receive() external payable {}

    // send contract stored in contract to the owner
    function sendContractBalanceToOwner() external payable onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // get contract balance
    function getContractBalance() public view onlyOwner returns (uint256) {
        return address(this).balance;
    }

    // get contract profits
    function getContractProfits() public view onlyOwner returns (uint256) {
        return _contractProfits;
    }

    // get fee value
    function getFeeValue() public view returns (uint256) {
        return _contractFee;
    }

    // change fee value
    function newFeeValue(uint256 _newFee) public onlyOwner {
        require(_newFee < 1000, "Check value of fee!");
        require(_newFee > 100, "Check value of fee!");

        _contractFee = _newFee;
    }

    // get fee for eth amount by wei
    function getFeeValueForAmountofWei(uint256 _amountOfWei)
        public
        view
        returns (uint256)
    {
        return (_amountOfWei * _contractFee) / 10000;
    }

    function mintToken(string calldata tokenURI) private returns (uint256) {
        _tokensCounter.increment();
        uint256 newItemId = _tokensCounter.current();

        // mint item id
        _mint(msg.sender, newItemId);

        // save item id with token url
        _setTokenURI(newItemId, tokenURI);

        // give the marketplace the approval to transact between users.
        setApprovalForAll(address(this), true);

        return newItemId;
    }

    function deleteItem(uint256 itemId) public {
        require(msg.sender == _marketItems[itemId].owner, "UnAuthorized!");
        require(
            _marketItems[itemId]._isDeleted != true,
            "This item already deleted!"
        );
        uint256 tokenId = _marketItems[itemId].tokenId;

        // delete item from array

        for (uint256 i = 0; i < _ownerToArrayOfTokens[msg.sender].length; i++) {
            if (itemId == _ownerToArrayOfTokens[msg.sender][i]) {
                for (
                    uint256 j = i;
                    j < _ownerToArrayOfTokens[msg.sender].length - 1;
                    j++
                ) {
                    _ownerToArrayOfTokens[msg.sender][
                        j
                    ] = _ownerToArrayOfTokens[msg.sender][j + 1];
                }
                _ownerToArrayOfTokens[msg.sender].pop();
                _marketItems[itemId]._isDeleted = true;

                // burn token using call burnToken function by call NFT contract.
                _burn(tokenId);

                emit ItemBurn(itemId, tokenId);
            }
        }
    }

    function createItem(string calldata tokenURI) public {
        uint256 tokenId = mintToken(tokenURI);

        _tokenIds.increment();
        uint256 itemId = _tokenIds.current();

        _marketItems[itemId] = NFTItem(
            tokenURI,
            itemId,
            tokenId,
            payable(address(0)),
            payable(msg.sender),
            0,
            false,
            false
        );

        _ownerToArrayOfTokens[msg.sender].push(itemId);

        // NFT transaction
        IERC721(address(this)).transferFrom(msg.sender, address(this), tokenId);

        emit NewItemAdded(
            tokenURI,
            itemId,
            tokenId,
            payable(address(0)),
            payable(msg.sender),
            0,
            false
        );
    }

    // create item with out add this item to listing page with price.
    // nonReentrant is a modifier to prevent reentry attak.
    function createItem(string calldata tokenURI, uint256 price) public {
        require(price > 0, "Price must be at least one wei");

        uint256 tokenId = mintToken(tokenURI);

        _tokenIds.increment();
        uint256 itemId = _tokenIds.current();

        _marketItems[itemId] = NFTItem(
            tokenURI,
            itemId,
            tokenId,
            payable(address(0)),
            payable(msg.sender),
            price,
            false,
            false
        );

        _ownerToArrayOfTokens[msg.sender].push(itemId);

        // NFT transaction
        IERC721(address(this)).transferFrom(msg.sender, address(this), tokenId);

        emit NewItemAdded(
            tokenURI,
            itemId,
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
            _marketItems[itemId]._isDeleted != true,
            "This item already deleted!"
        );

        require(msg.sender == _marketItems[itemId].owner, "UnAuthorized!");

        uint256 oldPrice = _marketItems[itemId].price;
        _marketItems[itemId].price = price;

        emit PriceUpdated(
            itemId,
            _marketItems[itemId].tokenId,
            oldPrice,
            price
        );
    }

    function buyItem(uint256 itemId) public payable {
        require(_marketItems[itemId].price > 0, "Not able to buy!");
        require(
            (msg.value / 1 ether) == _marketItems[itemId].price,
            "Please submit asking price in order to countinue"
        );
        require(_marketItems[itemId].sold == false, "Item already sold");
        require(
            msg.sender != _marketItems[itemId].owner,
            "You are the owner of this token!"
        );
        require(
            _marketItems[itemId]._isDeleted != true,
            "This item already deleted!"
        );

        // take fee from value
        uint256 feeValue = getFeeValueForAmountofWei(msg.value);

        // send fee to the owner
        payable(owner()).transfer(feeValue);
        _contractProfits += feeValue;

        // transfer the amount to the seller
        _marketItems[itemId].owner.transfer(msg.value - feeValue);

        // transfer the amount from contract address to the buyer
        IERC721(address(this)).transferFrom(
            address(this),
            msg.sender,
            _marketItems[itemId].tokenId
        );

        // change contract values
        address payable seller = _marketItems[itemId].owner;
        _marketItems[itemId].seller = seller;
        _marketItems[itemId].owner = payable(msg.sender);
        _marketItems[itemId].sold = true;
        _tokensSold.increment();

        // record purchase process
        _ownerToArrayOfBoughtTokens[msg.sender].push(itemId);

        // purchase event
        emit purchaseDone(msg.sender, itemId, _marketItems[itemId].price);
    }


    function getMarketNFTsCounter() public view returns(uint256){
        return _tokenIds.current();
    }


    function getMarketNFTsCounterForSoldItems() public view returns(uint256){
        return _tokensSold.current();
    }

    
    function fetchMarketNFTs() public view returns (NFTItem[] memory) {
        uint256 numberOfItems = _tokenIds.current();

        NFTItem[] memory items = new NFTItem[](numberOfItems);
        for (uint256 i = 0; i < numberOfItems; i++) {
            items[i] = _marketItems[i + 1];
        }

        return items;
    }

    function fetchNFTsForOwner() public view returns (NFTItem[] memory) {
        NFTItem[] memory items = new NFTItem[](
            _ownerToArrayOfTokens[msg.sender].length
        );

        for (uint256 i = 0; i < _ownerToArrayOfTokens[msg.sender].length; i++) {
            items[i] = _marketItems[_ownerToArrayOfTokens[msg.sender][i]];
        }

        return items;
    }

    function fetchNFTsBoughtForOwner() public view returns (NFTItem[] memory) {
        NFTItem[] memory items = new NFTItem[](
            _ownerToArrayOfBoughtTokens[msg.sender].length
        );

        for (
            uint256 i = 0;
            i < _ownerToArrayOfBoughtTokens[msg.sender].length;
            i++
        ) {
            items[i] = _marketItems[_ownerToArrayOfBoughtTokens[msg.sender][i]];
        }

        return items;
    }
}
