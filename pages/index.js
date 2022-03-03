import styles from "../styles/Home.module.css";
import Web3 from "web3";
import { useState } from "react/cjs/react.development";
import { useUser } from "@auth0/nextjs-auth0";
import { useEffect } from "react";
let web3 = new Web3("https://speedy-nodes-nyc.moralis.io/1c58af41ad51021daa7433bb/eth/mainnet");

export default function Home() {
  let { user, error, isLoading } = useUser();
  let [loggedIn, setLoggedIn] = useState(() => {
    false;
  });
  let [userWallet, setUserWallet] = useState(() => {
    Object.entries(web3.eth.accounts.wallet);
  });
  let [update, setUpdate] = useState(null);

  useEffect(() => {
    if (user) {
      setLoggedIn(true);
    }
  }, [user]);

  return (
    <div className={styles.container}>
      <div>MetaGate</div>
      {loggedIn ? (
        <div>
          {userWallet ? (
            <div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    web3.eth.accounts.wallet.create(1);
                    setUserWallet(Object.entries(web3.eth.accounts.wallet));
                    setUpdate(true);
                  }}>
                  Create New Account
                </button>
              </div>
              {userWallet.length == 0 ? (
                <>
                  <div>
                    <input id="accountAddressInput" type="text" placeholder="Account private key"></input>
                    <button
                      type="button"
                      onClick={() => {
                        web3.eth.accounts.wallet.add(accountAddressInput.value);
                        setUserWallet(Object.entries(web3.eth.accounts.wallet));
                      }}>
                      Add Account
                    </button>
                  </div>
                </>
              ) : (
                userWallet.map((account) => {
                  if (
                    account[0] == "_accounts" ||
                    account[0] == "defaultKeyName" ||
                    account[0] == "length" ||
                    /[a-zA-Z]/g.test(account[0])
                  ) {
                    return null;
                  }
                  return (
                    <div>
                      <h3>{JSON.parse(account[0]) + 1}:</h3>
                      <h5>Public address: {JSON.stringify(account[1].address)}</h5>
                      <h5>Private Key: {JSON.stringify(account[1].privateKey)}</h5>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setUserWallet(Object.entries(web3.eth.accounts.wallet));
              }}>
              Create Wallet
            </button>
          )}
        </div>
      ) : (
        <div>
          <button>
            <a href="/api/auth/login">Login</a>
          </button>
        </div>
      )}
    </div>
  );
}
