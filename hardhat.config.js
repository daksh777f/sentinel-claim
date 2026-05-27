import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    somnia_testnet: {
      url: "https://api.infra.testnet.somnia.network/",
      chainId: 50312,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    somnia_mainnet: {
      url: "https://api.infra.mainnet.somnia.network/",
      chainId: 5031,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: { somnia_testnet: process.env.SOMNIA_EXPLORER_API_KEY || "placeholder" },
    customChains: [{
      network: "somnia_testnet",
      chainId: 50312,
      urls: {
        apiURL: "https://shannon-explorer.somnia.network/api",
        browserURL: "https://shannon-explorer.somnia.network"
      }
    }]
  }
};
