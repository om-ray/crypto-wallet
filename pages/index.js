import styles from "../styles/Home.module.css";
import Web3 from "web3";
import { useState } from "react/cjs/react.development";
import { useEffect } from "react";

export default function Home() {
  let web3 = new Web3("https://speedy-nodes-nyc.moralis.io/1c58af41ad51021daa7433bb/eth/mainnet");
  let [userWallet, setUserWallet] = useState(web3.eth.accounts.wallet);
  let [update, setUpdate] = useState(null);

  return (
    <div className={styles.container}>
      <div>MetaGate</div>
      <div>
        {userWallet ? (
          <div>
            <div>
              <button
                type="button"
                onClick={() => {
                  web3.eth.accounts.wallet.create(1);
                  console.log(web3.eth.accounts.wallet);
                  setUserWallet(web3.eth.accounts.wallet);
                }}>
                Create New Account
              </button>
              {console.log(userWallet.defaultKeyName)}
            </div>
            {userWallet.length == 0 ? (
              <>
                <div>
                  <input id="accountAddressInput" type="text" placeholder="Account private key"></input>
                  <button
                    type="button"
                    onClick={() => {
                      web3.eth.accounts.wallet.add(accountAddressInput.value);
                      setUserWallet(web3.eth.accounts.wallet);
                    }}>
                    Add Account
                  </button>
                </div>
              </>
            ) : (
              Object.entries(userWallet)
                .slice(0, userWallet.length)
                .map((account) => {
                  setUpdate(true);
                  console.log(account);
                  return (
                    <div>
                      {console.log(userWallet)}
                      {account[1].index} Public address: {JSON.stringify(account[1].address)} Private Key:{" "}
                      {JSON.stringify(account[1].privateKey)}
                    </div>
                  );
                })
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setUserWallet(web3.eth.accounts.wallet);
            }}>
            Create Wallet
          </button>
        )}
      </div>
    </div>
  );
}
