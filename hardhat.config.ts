import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
      viaIR: true,
    },
  },
  networks: {
    mumbai: {
      url: process.env.RPC_URL,
      // accounts: {
      //   mnemonic: process.env.SECRETPHASE,
      //   path: "m/44'/60'/0'/0",
      // },
      accounts: [process.env.PRIVATE_KEY ?? ""],
    },
  },
};

export default config;
