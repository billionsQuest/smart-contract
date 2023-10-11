// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";
import "./BillionsNFT.sol";
import "./ScalarNFT.sol";

contract BattleContract is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    enum BattleState {
        Betting,
        Started,
        Ended,
        Expired
    }

    //////////////////////////// Game parameters ///////////////////////////
    uint256[4] public rankPercent = [50, 100, 200, 450]; // x1000
    uint256[4] public rewardPercent = [300, 200, 200, 300]; // x1000
    uint256[5] public bonusPercent = [500, 250, 150, 75, 25]; // x1000
    uint256 public rakePercent = 7; // x100
    uint256 public leaderBonus = 2; // x100
    ////////////////////////////////////////////////////////////////////////

    uint256 public battlePeriod = 1 days;

    uint256 public sinkThreshold = 4000000 * 10 ** 18; // 4M PLAY tokens
    uint256 public quarterInterval = 30 days;

    address public billionsNftAddress;
    address public scalarNftAddress;
    address public playTokenAddress;

    uint256 public reserveBalance;
    uint256 public lastUnlockTimestamp;

    uint256 public validWithdrawAmount = 0;

    uint256 public battleId = 0;

    struct PlayerInfo {
        uint256[] nftIds;
        uint256[] scalarIds;
    }

    mapping(uint256 => mapping(address => PlayerInfo)) enteredPlayerInfos; // (battle id => (player address => PlayerInfo))
    mapping(uint256 => address[]) enteredPlayerAddress; // (battle id => player address)

    mapping(uint256 => mapping(address => uint256)) rewardsEveryBattle; // (battle id => (player address => reward))
    mapping(uint256 => mapping(address => bool)) isUserParticipatedBattle;

    mapping(address => bool) public isVerifiedPlayer;

    struct BattleInfo {
        uint256 battleId;
        string exchange;
        string country;
        uint256 battleType;
        address creator;
        uint256 nftCount;
        uint256 entryFee;
        uint256 epoch;
        uint256 extraRewards;
        uint256 startTime;
        uint256 endTime;
        BattleState state;
        string passcode;
    }
    mapping(uint256 => BattleInfo) battles; // battle id => BattleInfo
    mapping(uint256 => uint256[]) public battlesEveryEpoch; // epoch => array of battle ids

    event _Withdraw(address, uint256);
    event _CreateBattle(
        uint256 _battleId,
        address indexed owner,
        string exchange,
        string country,
        uint256 nftCount,
        uint256 entryFee,
        uint256 startTime,
        uint256 endTime,
        uint256 battleType,
        string passcode
    );
    event _BetBattle(
        uint256 _battleId,
        address indexed _playerAddress,
        uint256[] _nftIds,
        uint256[] _scalarIds
    );
    event _ClaimedReward(
        uint256 _battleId,
        address indexed _player,
        uint256 _amount
    );
    event _SendReward2Owner(
        uint256 _battleId,
        address indexed _creator,
        address _owner,
        uint256 _amount
    );
    event _BattleStateChanged(uint256 _battleId, uint256 state);
    event _EndBattle(
        uint256 battleId,
        address[] rankedHolders,
        uint256[] rewards
    );

    /**
     * player can only bet when the battle is in betting status
     */
    modifier Bettable(uint256 _battleId) {
        require(_battleId < battleId, "Battle identification error");
        require(
            battles[_battleId].state == BattleState.Betting,
            "You are not allowed to bet on this Battle"
        );
        require(
            block.timestamp < battles[_battleId].startTime,
            "Betting has already started"
        );
        _;
    }

    /**
     * player can only claim when the battle is ended
     */
    modifier Claimable(uint256 _battleId) {
        require(_battleId < battleId, "Battle identification error");
        require(
            battles[_battleId].state == BattleState.Ended,
            "Battle is not ended yet"
        );
        _;
    }

    /**
     * verified player can only create the battle
     */
    modifier onlyVerifiedPlayer() {
        require(isVerifiedPlayer[msg.sender] == true, "No verified player");
        _;
    }

    /**
     * '_addr' is wallet address of trusted forwarder address
     * timestamp of 1 day is 60 * 60 * 24 = 86400
     */
    constructor(
        address _playTokenAddress,
        address _billionsNftAddress,
        address _scalarNftAddress
    ) {
        isVerifiedPlayer[msg.sender] = true;
        lastUnlockTimestamp = block.timestamp;

        playTokenAddress = _playTokenAddress;
        billionsNftAddress = _billionsNftAddress;
        scalarNftAddress = _scalarNftAddress;
    }

    function _initialize(
        address _billionsNft,
        address _scalarNft,
        address _plyToken
    ) external onlyOwner {
        billionsNftAddress = _billionsNft;
        scalarNftAddress = _scalarNft;
        playTokenAddress = _plyToken;
    }

    /**
     * '_battleType': 0 -> health battle, 1 -> blood battle
     * '_enterFee' is new entry fee defined by creator.
     * '_startTime' is the timestamp when betting will start
     * '_endTime' is the timestamp when betting will end
     *
     * - If 'battle.creatorAddress' is equal to 'owner', we can know this battle is created by owner.
     * - This function is called from backend (Game system creates 2 types of battle, health, and blood as default) or frontend (verified player creates battle).
     */
    function CreateBattle(
        uint256 _battleType,
        string memory _exchange,
        string memory _country,
        uint256 _enterFee,
        uint256 _nftCount,
        uint256 _startTime,
        uint256 _endTime,
        string memory _passcode
    ) external onlyVerifiedPlayer {
        require(_enterFee > 0, "Enter fee must be greater than 0");
        require(
            _endTime > _startTime,
            "End time must be greater than start time"
        );

        uint256 _currentBattleId = battleId;

        BattleInfo storage battle = battles[_currentBattleId];
        battle.battleId = _currentBattleId;
        battle.exchange = _exchange;
        battle.country = _country;
        battle.battleType = _battleType;
        battle.creator = msg.sender;
        battle.nftCount = _nftCount;
        battle.entryFee = _enterFee;
        battle.startTime = _startTime;
        battle.endTime = _endTime;
        battle.state = BattleState.Betting;
        battle.passcode = _passcode;

        battleId += 1;

        emit _CreateBattle(
            _currentBattleId,
            msg.sender,
            _exchange,
            _country,
            _nftCount,
            _enterFee,
            _startTime,
            _endTime,
            _battleType,
            _passcode
        );
    }

    /**
     * '_battleId' is the battle's ID the player is betting
     * '_nftIds' is the NFT's IDs selected by the player
     * '_scalarType' is the type of scalar, 0: non scalar, 1: multiplier, 2: negator, 3: index scalar
     *
     * - Player must pay the fee before betting.
     * - Betting is allowed only during the betting period.
     */
    function BetBattle(
        uint256 _battleId,
        uint256[] memory _nftIds,
        uint256[] memory _scalarIds,
        string memory _passcode
    ) external Bettable(_battleId) {
        BattleInfo memory battle = battles[_battleId];

        require(
            keccak256(abi.encodePacked(battle.passcode)) ==
                keccak256(abi.encodePacked(_passcode)),
            "passcode mismatch"
        );

        uint256 nftCount = _nftIds.length;
        require(battle.nftCount == nftCount, "NFT count error");
        require(
            !isUserParticipatedBattle[_battleId][msg.sender],
            "already participated in this battle"
        );

        isUserParticipatedBattle[_battleId][msg.sender] = true;

        uint256 i = 0;
        uint256 j = 0;
        for (i = 0; i < nftCount; i++) {
            for (j = i + 1; j < nftCount; j++) {
                require(_nftIds[i] != _nftIds[j], "Use of duplicated NFT");
            }
        }

        BillionsNFT billionsNFT = BillionsNFT(billionsNftAddress);
        ScalarNFT scalarNFT = ScalarNFT(scalarNftAddress);

        PlayerInfo storage player = enteredPlayerInfos[_battleId][msg.sender];

        for (i = 0; i < nftCount; i++) {
            uint256 _nftId = _nftIds[i];

            if (billionsNFT.getOwner(_nftId) != msg.sender) {
                require(
                    billionsNFT.isRenter(_battleId, _nftId, msg.sender),
                    "nft is not rented"
                );
            }

            player.nftIds.push(_nftId);
        }

        for (i = 0; i < _scalarIds.length; i++) {
            uint256 _scalarId = _scalarIds[i];
            require(
                scalarNFT.getOwner(_scalarId) == msg.sender,
                "This scalar is owned by another player"
            );
            scalarNFT.burn(_scalarId);
            player.scalarIds.push(_scalarId);
        }

        // Pay enter fee
        IERC20 payToken = IERC20(playTokenAddress);
        payToken.transferFrom(msg.sender, address(this), battle.entryFee);

        enteredPlayerAddress[_battleId].push(msg.sender);

        emit _BetBattle(_battleId, msg.sender, _nftIds, _scalarIds);
    }

    function EndBattle(
        uint256 _battleId,
        address[] memory _rankHolders,
        uint256[] memory _rankHoldersRewards
    ) external onlyOwner {
        require(_battleId < battleId, "Battle identification error");
        require(
            _rankHolders.length == _rankHoldersRewards.length,
            "Mismatch in lengths of user addresses and rewards arrays"
        );

        BattleInfo storage battle = battles[_battleId];
        require(
            battle.state == BattleState.Betting,
            "Battle have not started yet"
        );
        require(
            block.timestamp >= battle.startTime,
            "Battle cannot be cancelled before start"
        );

        battle.state = BattleState.Ended;
        emit _BattleStateChanged(_battleId, uint256(BattleState.Ended));

        address[] memory playerAddrs = enteredPlayerAddress[_battleId];
        uint256 playerCount = playerAddrs.length;
        uint256 totalAmount = playerCount.mul(
            battle.entryFee.add(battle.extraRewards)
        );

        uint256 rakePercentPrizePool = totalAmount.mul(rakePercent).div(100);
        uint256 leaderBonusPrizePool = totalAmount.mul(leaderBonus).div(100);

        if (playerAddrs.length == 0) return;

        mapping(address => uint256)
            storage rewardOfPlayers = rewardsEveryBattle[_battleId];

        for (uint256 i = 0; i < _rankHolders.length; i++) {
            require(
                isUserParticipatedBattle[_battleId][_rankHolders[i]],
                "User unauthorized"
            );
            rewardOfPlayers[_rankHolders[i]] += _rankHoldersRewards[i];
        }

        if (playerAddrs.length > 1) {
            transferOwnerFee(totalAmount, _battleId, battle.creator);
        }

        emit _EndBattle(_battleId, _rankHolders, _rankHoldersRewards);
    }

    function calculateRewards(
        uint256 _battleId,
        address[] memory _fivePercentileHolders,
        address[] memory _tenPercentileHolders,
        address[] memory _twentyPercentileHolders,
        address[] memory _fourtyFivePercentileHolders,
        uint256 _totalPrizePool
    ) private {
        mapping(address => uint256)
            storage rewardOfPlayers = rewardsEveryBattle[_battleId];

        uint256 _rank1Rewards = (_totalPrizePool * rewardPercent[0]) / 1000;
        uint256 _rank2Rewards = (_totalPrizePool * rewardPercent[1]) / 1000;
        uint256 _rank3Rewards = (_totalPrizePool * rewardPercent[2]) / 1000;
        uint256 _rank4Rewards = (_totalPrizePool * rewardPercent[3]) / 1000;

        for (uint256 i = 0; i < _fivePercentileHolders.length; i++) {
            require(
                isUserParticipatedBattle[_battleId][_fivePercentileHolders[i]],
                "user unauthorized"
            );
            rewardOfPlayers[_fivePercentileHolders[i]] += _rank1Rewards.div(
                _fivePercentileHolders.length
            );
        }
        for (uint256 i = 0; i < _tenPercentileHolders.length; i++) {
            require(
                isUserParticipatedBattle[_battleId][_tenPercentileHolders[i]],
                "user unauthorized"
            );
            rewardOfPlayers[_tenPercentileHolders[i]] += _rank2Rewards.div(
                _tenPercentileHolders.length
            );
        }
        for (uint256 i = 0; i < _twentyPercentileHolders.length; i++) {
            require(
                isUserParticipatedBattle[_battleId][
                    _twentyPercentileHolders[i]
                ],
                "user unauthorized"
            );
            rewardOfPlayers[_twentyPercentileHolders[i]] += _rank3Rewards.div(
                _twentyPercentileHolders.length
            );
        }
        for (uint256 i = 0; i < _fourtyFivePercentileHolders.length; i++) {
            require(
                isUserParticipatedBattle[_battleId][
                    _fourtyFivePercentileHolders[i]
                ],
                "user unauthorized"
            );
            rewardOfPlayers[_fourtyFivePercentileHolders[i]] += _rank4Rewards
                .div(_fourtyFivePercentileHolders.length);
        }
    }

    function calculateRewardsForLowParticipants(
        uint256 _battleId,
        uint256 _totalPrizePool,
        address[] memory _participants,
        uint16[5] memory _percents
    ) internal {
        mapping(address => uint256)
            storage rewardOfPlayers = rewardsEveryBattle[_battleId];

        for (uint256 i = 0; i < _participants.length; i++) {
            rewardOfPlayers[_participants[i]] += _totalPrizePool
                .mul(_percents[i])
                .div(1000);
        }
    }

    function setBonuses(
        uint256 _battleId,
        address[] memory _rank,
        uint256 _totalAmount
    ) private {
        uint256 _bonusPrizePool = _totalAmount.mul(leaderBonus).div(100);

        mapping(address => uint256)
            storage rewardOfPlayers = rewardsEveryBattle[_battleId];

        for (uint256 i = 0; i < _rank.length; i++) {
            require(
                isUserParticipatedBattle[_battleId][_rank[i]],
                "user unauthorized"
            );
            rewardOfPlayers[_rank[i]] += _bonusPrizePool
                .mul(bonusPercent[i])
                .div(1000);
        }
    }

    function transferOwnerFee(
        uint256 _totalAmount,
        uint256 _battleId,
        address _creatorAddress
    ) private {
        // Calculate fee percentages based on ownership
        uint256 ownerFeePercentage;
        uint256 sinkReserveFeePercentage;

        if (owner() == _creatorAddress) {
            ownerFeePercentage = 0;
            sinkReserveFeePercentage = 500; // 5% (fully)
        } else {
            ownerFeePercentage = 125; // 1.25%
            sinkReserveFeePercentage = 375; // 3.75%
        }

        uint256 ownerFee = (_totalAmount * ownerFeePercentage) / 10000;
        uint256 sinkReserveFee = (_totalAmount * sinkReserveFeePercentage) /
            10000;

        // Transfer fees to respective addresses
        if (ownerFee > 0) {
            IERC20(playTokenAddress).transfer(_creatorAddress, ownerFee);
            emit _SendReward2Owner(
                _battleId,
                address(this),
                _creatorAddress,
                ownerFee
            );
        }

        if (sinkReserveFee > 0) {
            reserveBalance += sinkReserveFee;
        }
    }

    function ClaimReward(
        uint256 _battleId
    ) external nonReentrant Claimable(_battleId) {
        uint256 reward;

        mapping(address => uint256) storage players = rewardsEveryBattle[
            _battleId
        ];

        reward = players[msg.sender];
        require(reward > 0, "You may have already claimed or not entered");

        IERC20 payToken = IERC20(playTokenAddress);
        uint256 _balance = payToken.balanceOf(address(this));
        require(_balance >= reward, "empty wallet");

        payToken.transfer(msg.sender, reward);

        emit _ClaimedReward(_battleId, msg.sender, reward);

        players[msg.sender] = 0;
    }

    function unlockReserve() external onlyOwner {
        require(
            reserveBalance >= sinkThreshold &&
                block.timestamp >= lastUnlockTimestamp + quarterInterval,
            "Reserve not ready for unlock"
        );

        uint256 unlockAmount = (reserveBalance * 20) / 100; // 20% unlock
        reserveBalance -= unlockAmount;
        lastUnlockTimestamp = block.timestamp;

        IERC20 payToken = IERC20(playTokenAddress);
        uint256 _balance = payToken.balanceOf(address(this));
        require(_balance >= unlockAmount, "empty wallet");

        // Transfer unlocked amount to developers
        payToken.transfer(owner(), unlockAmount);

        // Mint and distribute new NFT packages

        // Emit event for reserve unlock
        emit _Withdraw(msg.sender, unlockAmount);
    }

    /// contract owner can withdraw earned fund
    /// *_amount is amount of claim
    function WithdrawRevenue(uint256 _amount) external nonReentrant onlyOwner {
        require(
            validWithdrawAmount >= _amount,
            "You may be a unverified player"
        );

        IERC20 payToken = IERC20(playTokenAddress);

        uint256 _balance = payToken.balanceOf(address(this));
        require(_balance >= validWithdrawAmount, "empty wallet");

        payToken.transfer(msg.sender, _amount);
        validWithdrawAmount -= _amount;

        emit _Withdraw(msg.sender, _amount);
    }

    /// *_palyer can claim bonus and create battle
    function AddVerifiedPlayer(address _player) external onlyOwner {
        isVerifiedPlayer[_player] = true;
    }

    function RemoveVerifiedPlayer(address _player) external onlyOwner {
        isVerifiedPlayer[_player] = false;
    }

    function SetPlayTokenAddress(address _address) external onlyOwner {
        playTokenAddress = _address;
    }

    function SetBillionsNftAddress(address _addr) external onlyOwner {
        billionsNftAddress = _addr;
    }

    function SetScalarNftAddress(address _addr) external onlyOwner {
        scalarNftAddress = _addr;
    }

    /// get all players information in *_battleId game
    /// return arrays of player address and player infos
    function GetPlayersInBattle(
        uint256 _battleId
    )
        external
        view
        returns (address[] memory addrs, PlayerInfo[] memory infos)
    {
        addrs = enteredPlayerAddress[_battleId];
        uint256 playerCount = addrs.length;
        infos = new PlayerInfo[](playerCount);

        mapping(address => PlayerInfo)
            storage dumpPlayerInfo = enteredPlayerInfos[_battleId];

        for (uint256 i = 0; i < playerCount; i++) {
            infos[i] = dumpPlayerInfo[addrs[i]];
        }
    }

    /// get player information with *_address from *_battleId game
    function GetPlayer(
        uint256 _battleId,
        address _address
    ) external view returns (PlayerInfo memory) {
        return enteredPlayerInfos[_battleId][_address];
    }

    /// get total number of palyers in *_battleId game
    function GetPlayerCountInBattle(
        uint256 _battleId
    ) external view returns (uint256) {
        return enteredPlayerAddress[_battleId].length;
    }

    /// get array of reward that can be claimed in *_battleId game
    function GetRewardsInBattle(
        uint256 _battleId
    ) external view returns (address[] memory, uint256[] memory) {
        address[] memory dumpAddrs = enteredPlayerAddress[_battleId];
        uint256 playerCount = dumpAddrs.length;

        address[] memory addrs = new address[]((playerCount * 45) / 100 + 1);
        uint256[] memory rewards = new uint256[]((playerCount * 45) / 100 + 1);

        mapping(address => uint256) storage dumpRewards = rewardsEveryBattle[
            _battleId
        ];

        uint256 idx = 0;
        for (uint256 i = 0; i < playerCount; i++) {
            if (dumpRewards[dumpAddrs[i]] == 0) {
                continue;
            }

            addrs[idx] = dumpAddrs[i];
            rewards[idx] = dumpRewards[dumpAddrs[i]];
            idx += 1;
        }

        return (addrs, rewards);
    }

    /// get amount of reward that *_userAddress can be claimed in *_battleId game
    function GetPlayerReward(
        uint256 _battleId,
        address _userAddress
    ) external view returns (uint256 claimableAmount) {
        claimableAmount = rewardsEveryBattle[_battleId][_userAddress];
    }

    function GetBattle(
        uint256 _battleId
    ) external view returns (BattleInfo memory) {
        return battles[_battleId];
    }

    /// withdraw fund when someone sent other token in my wallet
    function withdrawFund(
        address _addr,
        uint256 _amount
    ) external onlyOwner returns (bool) {
        IERC20 otherToken = IERC20(_addr);
        otherToken.transfer(msg.sender, _amount);
        return true;
    }

    function setRewardPercent(uint256[] memory ranks) external onlyOwner {
        require(ranks.length == 4, "");
        uint256 sum = 0;
        for (uint256 i = 0; i < 4; i++) {
            sum += ranks[i];
        }

        require(sum == 1000);

        for (uint256 i = 0; i < 4; i++) {
            rewardPercent[i] = ranks[i];
        }
    }

    function setBonusPercent(uint256[] memory ranks) external onlyOwner {
        require(ranks.length == 5, "");
        uint256 sum = 0;
        for (uint256 i = 0; i < 5; i++) {
            sum += ranks[i];
        }

        require(sum == 1000);

        for (uint256 i = 0; i < 5; i++) {
            bonusPercent[i] = ranks[i];
        }
    }

    function setRakePercent(uint256 rake) external onlyOwner {
        require(rake < 100);
        require(rake > leaderBonus);

        rakePercent = rake;
    }

    function setLeaderBonus(uint256 leader) external onlyOwner {
        require(leader < 100);
        require(rakePercent > leader);

        leaderBonus = leader;
    }
}
