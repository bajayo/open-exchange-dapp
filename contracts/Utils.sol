pragma solidity ^0.4.15;

/*
    Utilities & Common Modifiers
*/
contract Utils {

    // events for debugging
    event Trace(string _data);
    event TraceAddress(address _data);
    event TraceUint256(uint256 _data);
    event TraceUint(uint _data);
    event TraceBytes32(bytes32 _data);
    event TraceBool(bool _data);

    /**
        constructor
    */
    function Utils() {
    }
    

    // verifies that an amount is greater than zero
    modifier greaterThanZero(uint256 _amount) {
        require(_amount > 0);
        _;
    }

    // verifies that x is smaller than y
    modifier smallerThan(uint _x, uint _y) {
        require(_x < _y);
        _;
    }

    // validates an address - currently only checks that it isn't null
    modifier validAddress(address _address) {
        require(_address != 0x0);
        _;
    }

    // verifies that the address is different than this contract address
    modifier notThis(address _address) {
        require(_address != address(this));
        _;
    }
    
}
