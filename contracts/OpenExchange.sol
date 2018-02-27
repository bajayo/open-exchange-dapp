pragma solidity ^0.4.2;
import "./Owned.sol";
import "./Utils.sol";
import "./SafeMath.sol";
import "./interfaces/IERC20Token.sol";
/*
Open Exchange contract should:
- let one submit a bid for an erc20 token.
- Bid data:
    - which erc token for sale
    - amount offered
    - type: ether or erc20 
    - demanded erc token 
- let one submit an ask of erc20
- Ask Data:
    - which erc requested.
    - how much is asked for
    - type: ether or erc20 
- Keep a queue of bids (offers) for each coin/asked coin (e.g: 100 XXX for 12 YYY) ordered by XXX/YYY rate (from low to high).
- Keep a queue of asks (selling) for each coin/asked coin (e.g: 100 90 XXX for 12 YYY) ordered by XXX/YYY rate (from high to low).
- An exchange transaction is executed when bid coin/asked coin qrate equals the same ask queue
- Exchange transaction:
    - amount of XXX is calculated by bid YYY 

 */
contract OpenExchange is Owned, Utils {
    using SafeMath for uint256;

    address public creator;
    uint nonce;

    struct Coin {
        IERC20Token addr;
        uint256 amount;
    } 

    struct Bid {
        Coin offered;
        Coin asked;
        uint256 rate;
        address bidder;
        bytes32 mask;
        bytes32 next;
    }

    mapping (address=>mapping (address=>bytes32)) offeredForAskedRoots;
    mapping (bytes32=>Bid) allBids;
    mapping (bytes32=>Bid) allRoots;

    function OpenExchange () {

    }
    
    function setBid(IERC20Token _offered, uint256 _offeredAmount,  IERC20Token _asked, uint256 _askedAmount) 
    public 
    {
        
        /*
        
        
        - Check if fits first offered (someone sells at the same, or lower rate)
            - do until asked amout = 0 or asked price biggeer than next offer 
            - make an exchange (or partial exchange if supplied amount smaller than requested)
            - delete "used" offer if drained
        - if left with asked amount > 0 - create bid for remaining asked amount
         */
         //- Assert transfer from - get the offered coins
         assert(_offered.transferFrom(msg.sender, address(this), _offeredAmount));
         //- get exchange root
         Bid askRoot = getExchangeRoot(_asked, _offered);
    }
    //Internal functions
    function getExchangeRoot(IERC20Token _offered, IERC20Token _asked) 
    internal 
    returns (Bid storage root)
    {
        bytes32 mask = keccak256(_offered, _asked);
        //get existing root for this combo if exists 
        root = allRoots[offeredForAskedRoots[_offered][_asked]];
        if (root.mask == mask) {
            return root;
        } 
        root = allRoots[offeredForAskedRoots[_offered][_asked]] = Bid(Coin(_offered, 0), Coin(_asked, 0), 0, 0x0, mask, "");
    }

    function generateMask() internal returns (bytes32 mask) {
        mask = keccak256(block.number, msg.data, nonce++);
    }

}