import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import 'dotenv/config'



const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: process.env.ALCHEMY_API,
      accounts: [process.env.PRIVATE_KEY !== undefined ? process.env.PRIVATE_KEY : '']
    }
  }
};

export default config;
