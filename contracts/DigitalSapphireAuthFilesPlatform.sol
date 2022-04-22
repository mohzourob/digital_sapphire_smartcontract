// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
// security against transactions for multiple requests
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract DigitalSapphireAuthFilesPlatform is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    using SafeMath for uint256;

    // item
    struct AuthItem {
        uint256 itemId;
        uint256 tokenId;
        address owner;
        bool _isDeleted;
    }

    Counters.Counter private _tokensCounter;
    Counters.Counter private _tokenIds;
    uint256 private _contractProfits;
    mapping(uint256 => AuthItem) private _marketItems;
    mapping(address => uint256[]) private _ownerToArrayOfTokens;

    event NewItemAdded(
        string tokenURI,
        uint256 indexed itemId,
        uint256 indexed tokenId,
        address owner
    );

    event ItemBurn(uint256 indexed itemId, uint256 indexed tokenId);

    constructor() ERC721("DigitalSapphireAuth", "DGSA") {}

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

    

}