// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
// security against transactions for multiple requests
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";


contract DigitalSapphireAuthFilesPlatform is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    using SafeMath for uint256;

    // plans - basic, standard, premium, custom
    enum SubscribePlansTypes {
        BASIC,
        STANDARD,
        PREMIUM,
        CUSTOM
    }

    // item
    struct AuthItem {
        string tokenURI;
        uint256 itemId;
        uint256 tokenId;
        address owner;
        bool _isDeleted;
    }

    // plans
    struct SubscribePlan{
        uint256 planId;
        uint256 numberOfCollections;
        uint256 numberOfItemsForEveryCollection;
        string planType;
        uint256 planPriceInUSD;
        bool isPrivate;
        bool isDeleted;
    }

    Counters.Counter private _tokensCounter;
    Counters.Counter private _tokenIds;
    Counters.Counter private _palnsCounter;
    uint256 private _contractProfits;
    mapping(uint256 => AuthItem) private _marketItems;
    mapping(address => uint256[]) private _ownerToArrayOfTokens;
    mapping (uint256 => SubscribePlan) private _subscribePlansDetails;
    mapping(address => uint256) private _userToSubscribePlan;
    mapping(address => Counters.Counter) private _userToNumberOfItems;
    mapping(address => Counters.Counter) private _userToNumberOfCollections;

    event NewItemAdded(
        string tokenURI,
        uint256 indexed itemId,
        uint256 indexed tokenId,
        address owner
    );

    event ItemBurn(uint256 indexed itemId, uint256 indexed tokenId);

    constructor() ERC721("DigitalSapphireAuth", "DGSA") {
        // add base plans

        // add basic plan
        _palnsCounter.increment();
        uint256 currentIndex = _palnsCounter.current();
        _subscribePlansDetails[currentIndex] = SubscribePlan(
            currentIndex,
            10,
            10000,
            "BASIC",
            50,
            false,
            false
        );

        // add standard plan
        _palnsCounter.increment();
        currentIndex = _palnsCounter.current();
        _subscribePlansDetails[currentIndex] = SubscribePlan(
            currentIndex,
            100,
            100000,
            "STANDARD",
            100,
            false,
            false
        );

        // add premium plan
        _palnsCounter.increment();
        currentIndex = _palnsCounter.current();
        _subscribePlansDetails[currentIndex] = SubscribePlan(
            currentIndex,
            1000,
            1000000,
            "PREMIUM",
            200,
            false,
            false
        );
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

    // compare two string function
    function compareStrings(string memory a, string memory b) private view returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    // get eth price ETH/USD from chainlink
    function getEthPriceInUSD() public view returns(uint256){ 
        // todo change address base on network will used.
        AggregatorV3Interface priceFee = AggregatorV3Interface(0x8A753747A1Fa494EC906cE90E9f37563A8AF630e);
       (,int price,,,)  = priceFee.latestRoundData();
        return uint256(price * 10000000000);
    }
    
    // price conversion
    function getConversionRate(uint256 ethAmount) private view returns (uint256){
        uint256 ethPrice = getEthPriceInUSD();
        uint256 ethAmountInUsd = (ethPrice * ethAmount) / 1000000000000000000;
        return ethAmountInUsd;
    }

    // mint tokens
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

    // get subscribe plans details for public
    function getSubscribePlansDetailsForPublic() public view returns(SubscribePlan[] memory) {
        SubscribePlan[] memory items = new SubscribePlan[](3);
        for (uint256 i = 0; i < 3; i++) {
            SubscribePlan memory item = _subscribePlansDetails[i + 1];
            if(!item.isPrivate){
                items[i] = item;
            }
        }

        return items;
    }

    // get subscribe plans details for owner
    function getSubscribePlansDetailsForOwner() public view onlyOwner returns (SubscribePlan[] memory){
        uint256 numberOfItems = _palnsCounter.current();

        SubscribePlan[] memory items = new SubscribePlan[](numberOfItems);
        for (uint256 i = 0; i < numberOfItems; i++) {
            items[i] = _subscribePlansDetails[i + 1];
        }

        return items;
    }

    // add custom plan by owner
    function addCustomPlan(uint256 _numberOfCollections, uint256 _numberOfItemsForEveryCollection, uint256 _planPriceInUSD) public onlyOwner{
        _palnsCounter.increment();
        uint256 currentIndex = _palnsCounter.current();
        _subscribePlansDetails[currentIndex] = SubscribePlan(
            currentIndex,
            _numberOfCollections,
            _numberOfItemsForEveryCollection,
            "CUSTOM",
            _planPriceInUSD,
            true,
            false
        );
    }


    function updatePlanNumberOfCollections(uint256 _planId, uint256 _numberOfCollections ) public onlyOwner{
        require(_subscribePlansDetails[_planId].planId > 0, "Plan does not exist");
        require(_numberOfCollections > 0 , "Enter valid number of collections");
        _subscribePlansDetails[_planId].numberOfCollections = _numberOfCollections;
    }


    function updatePlanNumerOfItemsForEveryCokkection(uint256 _planId, uint256 _numberOfItemsForEveryCollection) public onlyOwner {
        require(_subscribePlansDetails[_planId].planId > 0, "Plan does not exist");
        require(_numberOfItemsForEveryCollection > 0 , "Enter valid number of items");
        _subscribePlansDetails[_planId].numberOfItemsForEveryCollection = _numberOfItemsForEveryCollection;
    }

    function updatePlanPriceInUSD(uint256 _planId, uint256 _planPriceInUSD) public onlyOwner{
        require(_subscribePlansDetails[_planId].planId > 0, "Plan does not exist");
        require(_planPriceInUSD > 0 , "Enter valid price in USD");
        _subscribePlansDetails[_planId].planPriceInUSD = _planPriceInUSD;
    }

    function deletePlan(uint256 _planId) public onlyOwner{
        require(_subscribePlansDetails[_planId].planId > 0, "Plan does not exist");
        require(_subscribePlansDetails[_planId].isDeleted == false, "Plan already deleted.");
        require(compareStrings(_subscribePlansDetails[_planId].planType, "CUSTOM") == true, "Invalid plan.");

        _subscribePlansDetails[_planId].isDeleted = true;
        
    }


    function userSubscribeInPlan(uint256 planId) public payable {
        SubscribePlan memory plan = _subscribePlansDetails[planId];
        require(plan.planId > 0, "Plan does not exist");

        //ToDo active that line in real networks.
        // require((plan.planPriceInUSD * 10 ** 18) <= getConversionRate(msg.value), "You need to spend more ETH!");

        // send money to the owner of contract :P
        payable(owner()).transfer(msg.value);

        // calc the profits
        _contractProfits += msg.value;

        // subscribe plan to user
        _userToSubscribePlan[msg.sender] = planId;
    }

    function userGetHisSubscribePlan() public view returns(uint256 planId, uint256 numberOfCollections, uint256 numberOfItemsForEveryCollection, string memory planType, uint256 planPriceInUSD){
        SubscribePlan memory planDetils = _subscribePlansDetails[_userToSubscribePlan[msg.sender]];
        return (planDetils.planId, planDetils.numberOfCollections, planDetils.numberOfItemsForEveryCollection, planDetils.planType, planDetils.planPriceInUSD);
    }


    function ownerGetUserSubscribePlan(address user) public view onlyOwner returns(uint256 planId, uint256 numberOfCollections, uint256 numberOfItemsForEveryCollection, string memory planType, uint256 planPriceInUSD){
        SubscribePlan memory planDetils = _subscribePlansDetails[_userToSubscribePlan[user]];
        return (planDetils.planId, planDetils.numberOfCollections, planDetils.numberOfItemsForEveryCollection, planDetils.planType, planDetils.planPriceInUSD);
    }

    function createItem(string calldata tokenURI) public {
        SubscribePlan memory userPlan = _subscribePlansDetails[_userToSubscribePlan[msg.sender]];
        require(userPlan.planId > 0, "Need to subscribe in plan to add item.");
        require(_userToNumberOfItems[msg.sender].current() <= (userPlan.numberOfCollections * userPlan.numberOfItemsForEveryCollection), "You need to upgrade your plan!");

        uint256 tokenId = mintToken(tokenURI);

        _tokenIds.increment();
        uint256 itemId = _tokenIds.current();

        _marketItems[itemId] = AuthItem(
            tokenURI,
            itemId,
            tokenId,
            payable(msg.sender),
            false
        );

        _ownerToArrayOfTokens[msg.sender].push(itemId);

        // NFT transaction
        IERC721(address(this)).transferFrom(msg.sender, address(this), tokenId);

        // increase number of items user has
        _userToNumberOfItems[msg.sender].increment();

        emit NewItemAdded(
            tokenURI,
            itemId,
            tokenId,
            payable(msg.sender)
        );
    }
}