import React, { useEffect, useState } from 'react';
import './App.css';
import { Layout, Row, Col, Button } from "antd";
import { WalletSelector } from '@aptos-labs/wallet-adapter-ant-design';
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import {AptosAccount, Provider, Network, CoinClient, TransactionBuilder, TxnBuilderTypes, HexString} from "aptos";
import { Buffer } from 'buffer';

//import { AptosAccount, Provider, Network, CoinClient, TransactionBuilder, TxnBuilderTypes } from "/Users/jpark/Work/aptos-core/ecosystem/typescript/sdk/src";
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import TextArea from "antd/es/input/TextArea";

const provider = new Provider(Network.DEVNET);
const aptosClient = provider.aptosClient;
const coinClient = new CoinClient(provider.aptosClient);

const moduleAddress = "0xc3f4205e1f3d52fcd74385dfaabdd96edb6943a26db0ad8e6e7f7dd02b66ff85";
const eggCollectionName = "Egg Collection Name";

const privateKeyBytes_feePayer = Uint8Array.from(Buffer.from('f21423f436f7d44c2abd95b5a25323e81fc737040ab17ae8fe40dbf1b1de9e66', 'hex'));
const feePayer = new AptosAccount(privateKeyBytes_feePayer, '9bfdd4efe15f4d8aa145bef5f64588c7c391bcddaf34f9e977f59bd93b498f2a');

async function getEggTokenAddr(ownerAddr: HexString): Promise<HexString | null> {
  const tokenOwnership = await provider.getOwnedTokens(ownerAddr);
  for (const ownership of tokenOwnership.current_token_ownerships_v2) {
    console.log(ownership.current_token_data?.current_collection?.collection_name);
    if(ownership.current_token_data?.current_collection?.collection_name == eggCollectionName){
      return new HexString(ownership.current_token_data.token_data_id);
    }
  }
  return null;
}

function App() {
  const { account, signAndSubmitTransaction, signMessage, signTransaction } = useWallet();
  const [balance, setBalance] = useState(0);
  const [msg, setMsg] = useState("");

  const fetchBalance = async () => {
    if (!account) return [];
    const balance = await coinClient.checkBalance(account?.address);
    setBalance(Number(balance));
  };
  useEffect(() => {
    fetchBalance();
  }, [account?.address]);

  const updateMsg = async () => {
    setMsg(msg + `\n ${Number(balance)}`);
  };
  useEffect(() => {
    updateMsg();
  }, [account?.address]);
  const mintEgg = async () => {
    if (!account) return;
    // build a transaction payload to be submitted
    const payload = {
      type: "entry_function_payload",
      function: `${moduleAddress}::egg::mint_egg`,
      type_arguments: [],
      arguments: [],
    };
    // sign and submit transaction to chain
    const response = await signAndSubmitTransaction(payload);
    // wait for transaction
    await provider.waitForTransaction(response.hash);
  };

  const mintEggFeePayer = async () => {
    if (!account) return;
    // build a transaction payload to be submitted
    const payload = {
      type: "entry_function_payload",
      function: `${moduleAddress}::egg::mint_egg`,
      type_arguments: [],
      arguments: [],
    };
    const feePayerTxn = await aptosClient.generateFeePayerTransaction(account.address, payload, feePayer.address());
    // TODO: the following code is not working.
    //       `const senderAuthenticator = await aptosClient.signMultiTransaction(account, feePayerTxn);`
    const signature: string = await (window as any).petra.signMultiAgentTransaction(feePayerTxn);
    if (!signature) return;
    const signatureBytes = new HexString(signature).toUint8Array();
    const accountSignature = new TxnBuilderTypes.Ed25519Signature(signatureBytes);
    if (typeof account.publicKey !== 'string') {
      throw new Error('unexpected public key type');
    }
    const publicKeyBytes = new HexString(account.publicKey).toUint8Array();
    const senderAuthenticator = new TxnBuilderTypes.AccountAuthenticatorEd25519(
        new TxnBuilderTypes.Ed25519PublicKey(publicKeyBytes),
        accountSignature,
    );
    const feePayerAuthenticator = await aptosClient.signMultiTransaction(feePayer, feePayerTxn);
    // submit gas fee payer transaction
    const txn = await aptosClient.submitFeePayerTransaction(feePayerTxn, senderAuthenticator, feePayerAuthenticator);
    await aptosClient.waitForTransaction(txn.hash, { checkSuccess: true });
  };

  const hatchEgg = async () => {
    // check for connected account
    if (!account) return;
    const eggTokenAddr = await getEggTokenAddr(new HexString(account.address));
    if (!eggTokenAddr) return;
    // build a transaction payload to be submitted
    const payload = {
      type: "entry_function_payload",
      function: `${moduleAddress}::egg::hatch_egg`,
      type_arguments: [],
      arguments: [eggTokenAddr.hex()],
    };
    // sign and submit transaction to chain
    const response = await signAndSubmitTransaction(payload);
    // wait for transaction
    await provider.waitForTransaction(response.hash);
  };

  const hatchEggFeePayer = async () => {
    // check for connected account
    if (!account) return;
    const eggTokenAddr = await getEggTokenAddr(new HexString(account.address));
    if (!eggTokenAddr) return;
    // build a transaction payload to be submitted
    const payload = {
      type: "entry_function_payload",
      function: `${moduleAddress}::egg::hatch_egg`,
      type_arguments: [],
      arguments: [eggTokenAddr.hex()],
    };
    const feePayerTxn = await aptosClient.generateFeePayerTransaction(account.address, payload, feePayer.address());
    // TODO: the following code is not working.
    //       `const senderAuthenticator = await aptosClient.signMultiTransaction(account, feePayerTxn);`
    const signature: string = await (window as any).petra.signMultiAgentTransaction(feePayerTxn);
    if (!signature) return;
    const signatureBytes = new HexString(signature).toUint8Array();
    const accountSignature = new TxnBuilderTypes.Ed25519Signature(signatureBytes);
    if (typeof account.publicKey !== 'string') {
      throw new Error('unexpected public key type');
    }
    const publicKeyBytes = new HexString(account.publicKey).toUint8Array();
    const senderAuthenticator = new TxnBuilderTypes.AccountAuthenticatorEd25519(
      new TxnBuilderTypes.Ed25519PublicKey(publicKeyBytes),
      accountSignature,
    );
    const feePayerAuthenticator = await aptosClient.signMultiTransaction(feePayer, feePayerTxn);
    // submit gas fee payer transaction
    const txn = await aptosClient.submitFeePayerTransaction(feePayerTxn, senderAuthenticator, feePayerAuthenticator);
    await aptosClient.waitForTransaction(txn.hash, { checkSuccess: true });
  };

  return (
    <>
      <Layout>
        <Row align="middle">
          <Col span={10} offset={2}>
            <h1>User client</h1>
          </Col>
          {/*<Col>*/}
          {/*  <h2>Balance: {balance}</h2>*/}
          {/*</Col>*/}
          <Col span={12} style={{ textAlign: "right", paddingRight: "200px" }}>
            <WalletSelector />
          </Col>
        </Row>
      </Layout>
      <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
        <Col span={8} offset={2}>
          <Button onClick={mintEgg} block type="primary" style={{ height: "40px", backgroundColor: "#3f67ff" }}>
            Mint an egg token
          </Button>
        </Col>
        <Col span={9} offset={1}>
          <Button onClick={mintEggFeePayer} block type="primary" style={{ height: "40px", backgroundColor: "#008000" }}>
            Mint an egg token with fee payer
          </Button>
        </Col>
      </Row>
      <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
        <Col span={8} offset={2}>
          <Button onClick={hatchEgg} block type="primary" style={{ height: "40px", backgroundColor: "#3f67ff" }}>
            Hatch an egg token
          </Button>
        </Col>
        <Col span={9} offset={1}>
          <Button onClick={hatchEggFeePayer} block type="primary" style={{ height: "40px", backgroundColor: "#008000" }}>
            Hatch an egg token with fee payer
          </Button>
        </Col>
      </Row>
      {/*<Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>*/}
      {/*  <Col span={10} offset={2}>*/}
      {/*    <h3>{balance}</h3>*/}
      {/*    <h3>{msg}</h3>*/}
      {/*  </Col>*/}
      {/*</Row>*/}
    </>
  );
}

export default App;
