/* global assert */
var BigNumber = require('bignumber.js');
var sha3 = require("solidity-sha3").default;
// var should = require('should');

const RootcorePlatform = artifacts.require('./RootcorePlatform.sol');
const ERC20Token = artifacts.require('./ERC20Token.sol');
const Project = artifacts.require('./Project.sol');
const Contribution = artifacts.require('./Contribution.sol');
const Dispute = artifacts.require('./Dispute.sol');


const projectName = 'Project Name ';
const projectDesc = 'Project description ';
var projectsCounter = 0;
const contributionName = 'Contribution Name ';
const contributionDesc = 'Contribution description ';
var contributionsCounter = 0;
var valuationsCounter = 0;
var projectBounty = 10000000000000000000000;
var defaultprojectValuatorsShare = 15;
var defaultValuatorSkin = 10000000000000000000;
var defaultValuatorValue = 1000000000000000000000;
const defaultValuationPin = 234;
const defaultDisputeValue = 2000000000000000000000;
const defaultDisputePin = 1234;
const defaultDisputeRisk = 2000000000000000000000;
const defaultDisputeCost = 100000000000000000000;
const contributionData = 'This is the data of a contribution. It is only used for tests, in real life, it should only ofld a reference to the contribution data on the application itself.';
const Empty = '0x0000000000000000000000000000000000000000';
const validAddress = '0xb3022525aecf4c55bd219a0fb161aeef151fc4e7';

var ProjectState = {
    CREATED: 'Created',
    OPEN: 'Open',
    InValuation: 'InValuation',
    InReveal: 'InReveal',
    InProcessing: 'InProcessing',
    InDispute: 'InDispute',
    InFinalProcessing: 'InFinalProcessing',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
  }


async function initPlatform() {
	return RootcorePlatform.deployed();
}

async function initCoin() {
	return ERC20Token.deployed();
}

async function initProject(_address) {
	return Project.at(_address);
}

function isException(error) {
    let strError = error.toString();
    return strError.includes('invalid opcode') || strError.includes('invalid JUMP') || strError.includes('revert');
}

function ensureException(error) {
    assert(isException(error), error.toString());
}

async function createProject(_account , _platform, _state, _numOfContributions, _numOfValuations, _oracle, _bounty = projectBounty, _valuationsObject = null, _valuatorsShare = defaultprojectValuatorsShare) {
    // console.log(projectName + projectsCounter, projectDesc + projectsCounter);
    await _platform.createProject(projectName + projectsCounter, projectDesc + projectsCounter, _valuatorsShare, _oracle, { from: _account });
    //this only works if no one else uses the network and creates another new project 
    const projAddress = await _platform.getProject.call(projectsCounter); 
    projectsCounter++;
    p = Project.at(projAddress);

    // console.log('state =' + _state);

    if (_state == ProjectState.OPEN) {
        // console.log('funding project - open');
        let token = await initCoin();
        //console.log('token init');
        let res = await token.approve(p.address, _bounty);
        //console.log('funds approved');
        let x = await p.fundProject(_bounty, { from: _account });
        if (_numOfContributions)
            await createContributions(_platform, projAddress, _numOfContributions);
    }

    if (_state == ProjectState.InValuation) {
        // console.log('funding project - inValidation');
        let token = await initCoin();
        // console.log('token init - bounty =' + _bounty);
        let res = await token.approve(p.address, _bounty);
        // console.log('funds approved');
        let x = await p.fundProject(_bounty, { from: _account });
        var contList;
        if (_numOfContributions)
            contList = await createContributions(_platform, projAddress, _numOfContributions);
        if (_numOfValuations){
            // console.log('changing project state');
            await p.startValidations();
            // console.log('adding valuations');
            await createValuations(_platform, contList, _numOfValuations, _account, _valuationsObject);
        }  
    }
    return p;
}
async function createContributions(_platform, _projectAddress, _numOfContributions){
    // console.log('here');
    var contributionsList = [];
    var newCont;
    for (i = 0; i < _numOfContributions; i++) {
        newCont = await createContribution(_platform, _projectAddress);
        contributionsList.push(newCont[0]);
    }
    return contributionsList;
}
async function createContribution(_platform, _projectAddress){
    contributionsCounter++;
    await _platform.createContribution(_projectAddress, contributionName + contributionsCounter, contributionDesc + contributionsCounter, contributionData); 
    return await _platform.getLastContributions.call(0);
}
  
async function createValuations(_platform, _contributionsList, _numOfValuations, _account, _valuationsObject = null){
    var valuationsList = [];
    let skin = defaultValuatorSkin; //fallback num of tokens for each valuation.
    let value = defaultValuatorValue;
    let pin = defaultValuationPin;
    let token = await initCoin();
    for (i = 0; i < _contributionsList.length; i++) {
        // get project contributions list
        for (var j = 0; j <  _numOfValuations; j++) {
            if(_valuationsObject && _valuationsObject[i])
            {
                skin = _valuationsObject[i][j].skin;
                value = _valuationsObject[i][j].value;
                pin = _valuationsObject[i][j].pin;
            }
            await token.approve(_contributionsList[i], skin);
            // console.log('here');
            valuationsList.push(await createValuation(_platform, _contributionsList[i], _account, skin, value, pin));
        }
    }
    return valuationsList;
}
  
async function createValuation(_platform, _contribution, _account, _skin = defaultValuatorSkin, _value = defaultValuatorValue, _pin = defaultValuationPin){
    let mask = sha3(_value, _pin);
    let valuationId = await _platform.createValuation(_skin, _contribution, mask, { from: _account });
    valuationsCounter++;

    return valuationId;
}



  
// function for dynamic sorting
function compareValues(key, order='asc') {
    return function(a, b) {
        if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
        // property doesn't exist on either object
            return 0; 
        }

        const varA = (typeof a[key] === 'string') ? 
        a[key].toUpperCase() : a[key];
        const varB = (typeof b[key] === 'string') ? 
        b[key].toUpperCase() : b[key];

        let comparison = 0;
        if (varA > varB) {
            comparison = 1;
        } else if (varA < varB) {
            comparison = -1;
        }
        return (
            (order == 'desc') ? (comparison * -1) : comparison
        );
    };
}

function sortValuationsByValue(_arrValuationObjects)
{
    return _arrValuationObjects.sort(compareValues('value'));
}

async function getProjectContributions(_project){
    //get all project contributions
    //get contributions count
    let contCount = await _project.getContributionsCount.call();
    //get all contributions 
    let contAddresses = await _project.getAllContributionsList.call();
    return contAddresses;
}

async function calcContributionRelativeValue(_contribution){
    contributionVluations = new Array();
    var valuationData;
    let valuationsCount = await _contribution.getValuationsCount.call();
    for (i=0 ; i < valuationsCount.toNumber() ; i++) {
        valuationData = await c.getValuationdata.call(i);
        contributionVluations.push({value:valuationData[2], skin:valuationData[3], valuator:valuationData[0], mask:valuationData[1]});
    }
    let sortedvaluations = sortValuationsByValue(contributionVluations);
    return calcConrtibutionValue(sortedvaluations, 25);

}

function calcConrtibutionValue(_arrValuationObjects, _winsorPrecentile = 0.25) {
    //_arrValuationObjects[x].skin is the number of coins "risked" by the valuator 
    //_arrValuationObjects[x].value is the suggested contribution value 
    var totalWagers = new BigNumber(0);
    for (i = 0; i < _arrValuationObjects.length; i++) {
        if(_arrValuationObjects[i].value)
            totalWagers = totalWagers.plus(_arrValuationObjects[i].skin);
    }
    var sumWagers = new BigNumber(0);
    var result = new BigNumber(0);
    var passedThresh = false;
    for (i = 0; i < _arrValuationObjects.length; i++) {
        if(_arrValuationObjects[i].value){
            sumWagers = sumWagers.plus(_arrValuationObjects[i].skin);
            if (sumWagers.gt(totalWagers.mul(1-_winsorPrecentile))){
                //result += _arrValuationObjects[i].value * (totalWagers-sumWagers+_arrValuationObjects[i].skin)/totalWagers;  //TODO: explain
                result = result.plus(new BigNumber(_arrValuationObjects[i].value).mul(totalWagers.minus(sumWagers).plus(_arrValuationObjects[i].skin)).div(totalWagers)) ;  //TODO: explain
                return (result);
            }
            if (sumWagers.gt(totalWagers.mul(_winsorPrecentile))){
                if (!passedThresh){
                    passedThresh = true;
                    //result += _arrValuationObjects[i].value * sumWagers/totalWagers;
                    //result = result.plus(sumWagers.mul(_arrValuationObjects[i].value).div(totalWagers));
                    result = result.plus(new BigNumber(_arrValuationObjects[i].value).mul(sumWagers).div(totalWagers));
                } else {
                    //result += _arrValuationObjects[i].value * _arrValuationObjects[i].skin/totalWagers;
                    result = result.plus(new BigNumber(_arrValuationObjects[i].value).mul(_arrValuationObjects[i].skin).div(totalWagers));
                    // result = result.plus(totalWagers.mul(new BigNumber(1).div(_arrValuationObjects[i].value).mul( _arrValuationObjects[i].skin)));
                }
            }
        }   
    }

    return(result);
}

function calcContributionBounty(_contRelativeValue, _projectTotalBounty, _arrAllProjectContributions){
    var totalContributionRelativeValues = 0;
    for (i=0; i<_arrAllProjectContributions.length; i++) {
        totalContributionRelativeValues += _arrAllProjectContributions[i].relativeValue;
    }
    // console.log("totalContributionRelativeValues = ", totalContributionRelativeValues);
    return _contRelativeValue*(_projectTotalBounty/totalContributionRelativeValues);
}


function calcValuatorsShares(_arrValuationObjects, _CalculatedValue, _valuationsAllocatedBalance = 0){
    var totalValidRewards = 0;
    var distanceFactor;
    var returnArray = _arrValuationObjects;
    returnArray.forEach(element => {
        console.log("distanceFactor = " , distanceFactor);
        distanceFactor = (element.value > 0)? Math.E**(-3 * Math.abs(Math.log(element.value / _CalculatedValue))) : 0;
        element.reward = distanceFactor * element.skin;
        totalValidRewards += distanceFactor * element.skin;
    });
    returnArray.forEach(element => {
        element.reward = (element.reward  / totalValidRewards) * _valuationsAllocatedBalance;
    });
    return returnArray;
}

function precisionRound(number, precision) {
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
  }
//console.log(precisionRound(1234.5678, 1));
// expected output: 1234.6




module.exports = {
    zeroAddress: '0x0000000000000000000000000000000000000000',
    isException: isException,
    ensureException: ensureException,
    calcConrtibutionValue: calcConrtibutionValue,
    sortValuationsByValue: sortValuationsByValue,
    calcValuatorsShares: calcValuatorsShares,
    calcContributionRelativeValue: calcContributionRelativeValue,
    calcContributionBounty: calcContributionBounty,
    createProject: createProject,
    projectName,
    projectDesc,
    projectsCounter,
    contributionName,
    contributionDesc,
    contributionsCounter,
    valuationsCounter,
    projectBounty,
    defaultprojectValuatorsShare,
    defaultValuatorSkin,
    defaultValuatorValue,
    defaultValuationPin,
    defaultDisputeValue,
    defaultDisputePin,
    defaultDisputeRisk,
    defaultDisputeCost,
    contributionData,
    Empty,
    ProjectState,
    validAddress,
    initPlatform,
    initCoin
    
};
