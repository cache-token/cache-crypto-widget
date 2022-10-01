import { Client } from 'mythxjs';
import fs from 'fs';

const buffer = fs.readFileSync('./contracts/WrapperContract.sol', "utf8");

const mythx = new Client({
  username: process.env.MYTHX_EMAIL as string,
  apiKey: process.env.MYTHX_API_KEY as string
});

async function main() {
  const response1 = await mythx.submitSourceCode(buffer, "WrapperContract");
  const response2 = await mythx.getDetectedIssues(response1?.uuid);
  console.log(response2[1]?.issues);
}

main()
.then(() => {
  process.exit(0);
})
.catch((error) => {
  console.error(error);
  process.exit(1);
});