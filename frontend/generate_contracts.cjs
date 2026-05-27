const fs = require('fs');
const sentinelArt = JSON.parse(fs.readFileSync('../artifacts/contracts/SentinelClaim.sol/SentinelClaim.json', 'utf8'));
const reactorArt = JSON.parse(fs.readFileSync('../artifacts/contracts/RiskPoolReactor.sol/RiskPoolReactor.json', 'utf8'));

const deployments = JSON.parse(fs.readFileSync('../deployments.json', 'utf8'));

const content = `export const CONTRACT_ADDRESS = "${deployments.SentinelClaim}";
export const REACTOR_ADDRESS = "${deployments.RiskPoolReactor}";

export const SENTINEL_ABI = ${JSON.stringify(sentinelArt.abi, null, 2)};
export const REACTOR_ABI = ${JSON.stringify(reactorArt.abi, null, 2)};
`;

fs.mkdirSync('src/utils', { recursive: true });
fs.writeFileSync('src/utils/contracts.js', content);
