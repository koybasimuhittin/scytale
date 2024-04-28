const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('node:fs');
const { ethers } = require("ethers");
const chainConfig = require("../chainConfig.json");
require('dotenv').config()
const sha256 = require('js-sha256');
const scytaleArtifact = require("../../hardhat/artifacts/contracts/Scytale.sol/Scytale.json");

//node index.js PRIVATE_KEY PORT
//or it can be added to env
const args = process.argv;
const privateKeyArg = args[2];
const portArg = args[3]

const port = portArg || process.env.PORT || 8080;
const app = express();
app.use(
    cors()
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const folderName = "./files";

app.post("/postMessage", async (req, res) => {
    try {

        if (!fs.existsSync(folderName)) {
            fs.mkdirSync(folderName);
        }

        const messageHash = sha256(req.body.message);
        fs.writeFileSync(`${folderName}/${messageHash}`, req.body.message);

        return res.status(200).json({
            messageHash: messageHash,
        });
    } catch (e) {
        console.error(e.message);
        return res.status(500).json("Error!");
    }

});


app.get("/getMessage", async (req, res) => {
    try {

        const data = fs.readFileSync(`${folderName}/${req.query.messageHash}`, 'utf8');
        return res.status(200).json(data);
    } catch (e) {
        console.error(e.message);
        return res.status(500).json("Error!");
    }

});




async function setupSigner() {
    const provider = new ethers.JsonRpcProvider(chainConfig.providerUrl);
    let signer = new ethers.Wallet(privateKeyArg ? privateKeyArg : process.env.PRIVATE_KEY);
    signer = signer.connect(provider);
    console.log("Signer address: ", await signer.getAddress());
    globalSigner = signer;
    return signer;
}


async function initializeEthers() {
    const signer = await setupSigner();
    const signerAddress = await signer.getAddress();
    try {
        const scytale = new ethers.Contract(chainConfig.scytaleAddress, scytaleArtifact.abi, signer);
        scytale.on("MessageBroadcasted", async (storeNodeAddress, messageHash) => {
            try {
                if (signerAddress.toLowerCase() == storeNodeAddress.toString().toLowerCase()) {
                    console.log("Received Broadcast: ", storeNodeAddress, messageHash);
                    const fileName = messageHash.toString().toLowerCase().substring(2);
                    const data = fs.readFileSync(`${folderName}/${fileName}`, 'utf8');
                    const apiEndpoint = `${process.env.IP_ADDRESS}/getMessage?messageHash=${fileName}`;

                    await scytale.acceptMessage(messageHash, apiEndpoint);
                    console.log("Success: ", messageHash);
                }

            } catch (e) {
                console.error("Error:" ,e.message);
            }

        });

                //ADMIN
                app.post("/depositStake", async (req, res) => {
                    if (req.body.admin != process.env.ADMIN_KEY) return res.status(401).json("No authorization!");
                    console.log(await signer.provider.getBalance(signerAddress));
                    const reciept = await scytale.depositNodeStake({value: ethers.parseEther("0.1")});
                    console.log(reciept);

                    res.status(200).json("Success!");
                });



    } catch (e) {
        console.error("Error: ", e.message);
    }
}

initializeEthers();




app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
