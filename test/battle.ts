import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import {
  BillionsNFT,
  ERC20,
  MarketPlaceContract,
  MyToken,
  BattleContract,
  ScalarNFT,
} from "../typechain-types";

function generateRandomString(length: number) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}

describe("BattleContract", function () {
  let battleContract: BattleContract;
  let billionsNftContract: BillionsNFT;
  let scalarNftContract: ScalarNFT;
  let PLYTokenContract: MyToken;
  let owner: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;
  let players: SignerWithAddress[];

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    [owner, player1, player2] = signers;
    players = [...signers.slice(3, 13)];
    // players = []

    const PLYToken = await ethers.getContractFactory("MyToken"); // Replace with the actual PLYToken contract name
    PLYTokenContract = await PLYToken.deploy("PLY Token", "PLY"); // Provide the name and symbol as constructor arguments
    await PLYTokenContract.deployed();
    // Deploy the BillionsNFT and ScalarNFT contracts
    const BillionsNFT = await ethers.getContractFactory("BillionsNFT");
    billionsNftContract = await BillionsNFT.deploy(
      "BillionsNFT",
      "BSN",
      PLYTokenContract.address
    );
    await billionsNftContract.deployed();

    const ScalarNFT = await ethers.getContractFactory("ScalarNFT");
    scalarNftContract = await ScalarNFT.deploy(PLYTokenContract.address);
    await scalarNftContract.deployed();

    const BattleContract = await ethers.getContractFactory("BattleContract");
    battleContract = await BattleContract.deploy(
      PLYTokenContract.address,
      billionsNftContract.address,
      scalarNftContract.address
    );
    await battleContract.deployed();

    await battleContract._initialize(
      billionsNftContract.address,
      scalarNftContract.address,
      PLYTokenContract.address
    );

    await scalarNftContract.setPayTokenAddress(PLYTokenContract.address);
  });

  it("should create a new battle with correct parameters", async function () {
    const battleType = 0; // Sample value for battle type
    const exchange = "NSE"; // Sample value for battle type
    const country = "IN"; // Sample value for battle type
    const enterFee = ethers.utils.parseEther("0.1"); // Sample value for entry fee (0.1 ETH)
    const nftCount = 3; // Sample value for the number of NFTs required to enter the battle
    const startTime = (await time.latest()) + time.duration.days(1);
    const endTime = (await time.latest()) + time.duration.days(7);

    // Create the battle
    await battleContract
      .connect(owner)
      .CreateBattle(
        battleType,
        exchange,
        country,
        enterFee,
        nftCount,
        startTime,
        endTime,
        ""
      );

    // Get the created battle info
    const battleInfo = await battleContract.GetBattle(0); // Assuming the first battle has ID 0

    // Assert that the battle is created with the correct parameters
    expect(battleInfo.battleType).to.equal(battleType);
    expect(battleInfo.creator).to.equal(owner.address);
    expect(battleInfo.nftCount).to.equal(nftCount);
    expect(battleInfo.entryFee).to.equal(enterFee);
    expect(battleInfo.startTime).to.equal(startTime);
    expect(battleInfo.endTime).to.equal(endTime);
    expect(battleInfo.state).to.equal(0); // 0 corresponds to BattleState.Betting
  });

  it("should allow players to bet on a created battle", async function () {
    // First, create a new battle as in the previous test case
    const battleType = 0; // Sample value for battle type
    const exchange = "NSE"; // Sample value for battle type
    const country = "IN"; // Sample value for battle type
    const enterFee = ethers.utils.parseEther("0.1"); // Sample value for entry fee (0.1 ETH)
    const nftCount = 3; // Sample value for the number of NFTs required to enter the battle
    const startTime = (await time.latest()) + time.duration.days(1);
    const endTime = (await time.latest()) + time.duration.days(7);

    // Create the battle
    await battleContract
      .connect(owner)
      .CreateBattle(
        battleType,
        exchange,
        country,
        enterFee,
        nftCount,
        startTime,
        endTime,
        ""
      );

    await billionsNftContract.mint(player1.address, "AAPL", "AAPL_Apple");
    await billionsNftContract.mint(player1.address, "AL", "AL");
    await billionsNftContract.mint(player1.address, "APL", "APL");
    await billionsNftContract.mint(player1.address, "PL", "PL");

    const mintPrice = ethers.utils.parseEther("10");
    await PLYTokenContract.connect(player1).mint(player1.address, mintPrice);
    await PLYTokenContract.connect(player1).approve(
      scalarNftContract.address,
      mintPrice
    );
    await scalarNftContract
      .connect(player1)
      .setApprovalForAll(battleContract.address, true);
    await scalarNftContract.connect(player1).mint(); // Use player1 signer here

    const battleId = 0; // Assuming the first battle has ID 0
    const nftIds = [1, 2, 3]; // Sample NFT IDs to bet
    const scalarIds: number[] = [0]; // Sample scalar NFT IDs to bet

    // Bet on the battle
    await PLYTokenContract.connect(player1).approve(
      battleContract.address,
      mintPrice
    );
    await battleContract
      .connect(player1)
      .BetBattle(battleId, nftIds, scalarIds, "");

    // Get the player info for the entered battle
    const playerInfo = await battleContract.GetPlayer(
      battleId,
      player1.address
    );

    // Assert that the player info is updated correctly
    expect(playerInfo.nftIds.map((i) => Number(i.toString()))).to.have.members(
      nftIds
    );
    expect(
      playerInfo.scalarIds.map((i) => Number(i.toString()))
    ).to.have.members(scalarIds);
  });

  it("should end a battle and calculate rewards and bonuses", async function () {
    // First, create a new battle
    const battleType = 0; // Sample value for battle type
    const exchange = "NSE";
    const country = "IN";
    const enterFee = ethers.utils.parseEther("10"); // Sample value for entry fee (0.1 ETH)
    const nftCount = 3; // Sample value for the number of NFTs required to enter the battle
    const startTime = (await time.latest()) + time.duration.seconds(10000); // Start in 40 seconds
    const endTime = startTime + time.duration.days(7); // End after 7 days from start

    await battleContract.AddVerifiedPlayer(player1.address);
    // Create the battle
    await battleContract
      .connect(player1)
      .CreateBattle(
        battleType,
        exchange,
        country,
        enterFee,
        nftCount,
        startTime,
        endTime,
        "arun"
      );

    const battleId = 0;
    const mintPrice = ethers.utils.parseEther("100");

    const randomAddresses = Array.from(
      { length: 5 },
      () => ethers.Wallet.createRandom().address
    );

    const demoPlayers: SignerWithAddress[] = [];

    for (let i = 0; i < 1; i++) {
      players.forEach((p) => demoPlayers.push(p));
    }

    const currentPlayers = [...demoPlayers]; // List of players
    let nftIndex = 0;
    let scalarIndex = 0;

    console.table(currentPlayers);

    // Mint NFTs and place bets for each player
    for (const player of currentPlayers) {
      await billionsNftContract.mint(
        player.address,
        generateRandomString(10),
        generateRandomString(10)
      );
      await billionsNftContract.mint(
        player.address,
        generateRandomString(10),
        generateRandomString(10)
      );
      await billionsNftContract.mint(
        player.address,
        generateRandomString(10),
        generateRandomString(10)
      );
      await PLYTokenContract.connect(player).mint(player.address, mintPrice);
      await PLYTokenContract.connect(player).approve(
        scalarNftContract.address,
        mintPrice
      );
      await scalarNftContract.connect(player).mint();
      await scalarNftContract
        .connect(player)
        .setApprovalForAll(battleContract.address, true);

      await PLYTokenContract.connect(player).approve(
        battleContract.address,
        mintPrice
      );
      await battleContract
        .connect(player)
        .BetBattle(
          battleId,
          [nftIndex, nftIndex + 1, nftIndex + 2],
          [scalarIndex],
          "arun"
        );
      nftIndex += 3;
      scalarIndex += 1;
    }

    console.log("BETTED--------------");
    // Wait for the battle to start
    await ethers.provider.send("evm_increaseTime", [4000]); // Fast-forward time by 10 seconds
    await ethers.provider.send("evm_mine", []); // Mine a new block to update the timestamp

    // Wait for the battle to end
    await ethers.provider.send("evm_increaseTime", [time.duration.days(7)]); // Fast-forward time by 7 days
    await ethers.provider.send("evm_mine", []); // Mine a new block to update the timestamp

    // Calculate the lengths of arrays based on percentages
    const first5Percent = Math.ceil(currentPlayers.length * 0.05);
    const second5Percent = Math.ceil(currentPlayers.length * 0.05);
    const third10Percent = Math.ceil(currentPlayers.length * 0.1);
    const fourth25Percent = Math.ceil(currentPlayers.length * 0.25);

    // Slice the currentPlayers array into different segments
    const rank1 = currentPlayers
      .slice(0, first5Percent)
      .map((player) => player.address);
    const rank2 = currentPlayers
      .slice(first5Percent, first5Percent + second5Percent)
      .map((player) => player.address);
    const rank3 = currentPlayers
      .slice(
        first5Percent + second5Percent,
        first5Percent + second5Percent + third10Percent
      )
      .map((player) => player.address);
    const rank4 = currentPlayers
      .slice(
        first5Percent + second5Percent + third10Percent,
        first5Percent + second5Percent + third10Percent + fourth25Percent
      )
      .map((player) => player.address);

    let allRanks = [...rank1, ...rank2, ...rank3, ...rank4].slice(0, 5);

    if (currentPlayers.length == 5) {
      allRanks = allRanks.slice(0, 4);
    }
    if (currentPlayers.length == 4) {
      allRanks = allRanks.slice(0, 4);
    }
    if (currentPlayers.length == 3) {
      allRanks = allRanks.slice(0, 3);
    }
    if (currentPlayers.length == 2) {
      allRanks = allRanks.slice(0, 2);
    }

    console.log("ALL RANKS");
    console.table(allRanks);

    const rankRewards = allRanks.map((data, i) => {
      return 100 - i;
    });
    // End the battle
    await battleContract
      .connect(owner)
      .EndBattle(battleId, allRanks, rankRewards);

    const playersCount = await battleContract.GetPlayerCountInBattle(0);
    // console.log("----BONUS----");
    // console.table(
    //   await Promise.all(
    //     currentPlayers.map(async (player) => {
    //       const bonus = await battleContract.GetPlayerBonus(battleId, player.address);
    //       return {
    //         user: player.address,
    //         reward: bonus.toString(),
    //       };
    //     })
    //   )
    // );
    console.log("RESERVED BALANCE - ", await battleContract.reserveBalance());
    console.log("----REWARDS----");
    console.table(
      await Promise.all(
        currentPlayers.map(async (player) => {
          const bonus = await battleContract.GetPlayerReward(
            battleId,
            player.address
          );
          const balance = await PLYTokenContract.balanceOf(player.address);
          return {
            user: player.address,
            reward: bonus.toString(),
            balance: balance.toString(),
          };
        })
      )
    );

    // // Get the battle info after ending the battle
    const battleInfo = await battleContract.GetBattle(0);

    // Assert that the battle is ended and rewards and bonuses are calculated correctly
    expect(playersCount).to.equal(currentPlayers.length);
    expect(battleInfo.battleType).to.equal(0);
    expect(battleInfo.state).to.equal(2); // 2 corresponds to BattleState.Ended
  });

  it("should allow renting an NFT", async function () {
    // Mint an NFT
    await billionsNftContract.connect(owner).mint(owner.address, "NFT", "NFT");
    await billionsNftContract
      .connect(owner)
      .mint(owner.address, "NFT2", "NFT2");
    await billionsNftContract.setPlayTokenAddress(PLYTokenContract.address);

    // Update renting status of the NFT
    await billionsNftContract
      .connect(owner)
      .updateNftRentingStatus(0, ethers.utils.parseEther("1"), true);
    await billionsNftContract
      .connect(owner)
      .updateNftRentingStatus(1, ethers.utils.parseEther("1"), true);

    // Transfer some PlayTokens to the sender
    await PLYTokenContract.connect(owner).mint(
      owner.address,
      ethers.utils.parseEther("10")
    );

    // Connect a new user
    await PLYTokenContract.connect(player1).mint(
      player1.address,
      ethers.utils.parseEther("10")
    );

    // Rent the NFT by the user
    await PLYTokenContract.connect(player1).approve(
      billionsNftContract.address,
      ethers.utils.parseEther("10")
    );
    await billionsNftContract.connect(player1).rentAnNft(1, [0, 1]);

    // Check if the user is the renter
    const isRenter = await billionsNftContract
      .connect(owner)
      .isRenter(1, 0, player1.address);
    const isRenter1 = await billionsNftContract
      .connect(owner)
      .isRenter(1, 1, player1.address);
    const isRenter2 = await billionsNftContract
      .connect(owner)
      .isRenter(1, 2, player1.address);
    expect(isRenter).to.be.true;
    expect(isRenter1).to.be.true;
    expect(isRenter2).to.be.false;
  });
});
