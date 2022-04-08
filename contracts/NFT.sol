// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


contract NFT is ERC721URIStorage {
    using Counters for Counters.Counter;
    using SafeMath for uint256;

    // counter to keep track of tokenIds
    Counters.Counter private _tokensCounter;

    // address of marketplace for NFTs to interact
    address public contractAddress;

    constructor(address marketplaceAddress) ERC721("DigitalSapphire", "DSH"){
        contractAddress = marketplaceAddress;
    }

    function mintToken(string memory tokenURI) public returns (uint256){
        _tokensCounter.increment();
        uint256 newItemId = _tokensCounter.current();

        // mint item id
        _safeMint(msg.sender, newItemId);

        // save item id with token url
        _setTokenURI(newItemId, tokenURI);

        // give the marketplace the approval to transact between users.
        setApprovalForAll(contractAddress, true);

        return newItemId;
    }
}
