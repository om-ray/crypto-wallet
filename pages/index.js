import styles from "../styles/Home.module.css";
import Web3 from "web3";
import { useCallback, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0";
import { useEffect } from "react";

let networkProviders = {
  "Eth Mainnet": "https://speedy-nodes-nyc.moralis.io/1c58af41ad51021daa7433bb/eth/mainnet",
  "BSC Mainnet": "https://speedy-nodes-nyc.moralis.io/1c58af41ad51021daa7433bb/bsc/mainnet",
  "Polygon Mainnet": "https://speedy-nodes-nyc.moralis.io/1c58af41ad51021daa7433bb/polygon/mainnet",
  "Arbitrum Mainnet": "https://speedy-nodes-nyc.moralis.io/1c58af41ad51021daa7433bb/arbitrum/mainnet",
  "Rinkeby Testnet": "https://speedy-nodes-nyc.moralis.io/1c58af41ad51021daa7433bb/arbitrum/testnet",
  "Avalanche Mainnet": "https://speedy-nodes-nyc.moralis.io/1c58af41ad51021daa7433bb/avalanche/mainnet",
  "Avalanche Testnet": "https://speedy-nodes-nyc.moralis.io/1c58af41ad51021daa7433bb/avalanche/testnet",
  "Fantom Mainnet": "https://speedy-nodes-nyc.moralis.io/1c58af41ad51021daa7433bb/fantom/mainnet",
};

let web3 = new Web3(networkProviders["Eth Mainnet"]);
let dbUrl = "http://localhost:5000/graphql";
let addressNamesObject = {};

function getKeyByValue(object, value) {
  return Object.keys(object).find((key) => object[key] === value);
}

export default function Home() {
  let { user, error, isLoading } = useUser();
  let [networkProvider, setNetworkProvider] = useState(() => {
    return getKeyByValue(networkProviders, networkProviders["Eth Mainnet"]);
  });
  let [, updateState] = useState();
  let [loggedIn, setLoggedIn] = useState(() => {
    false;
  });
  let [userWallet, setUserWallet] = useState(() => {
    Object.entries(web3.eth.accounts.wallet);
  });
  let [networkProviderChanged, setNetworkProviderChanged] = useState(false);
  let [encryptedWallet, setEncryptedWallet] = useState(() => {});

  useEffect(() => {
    if (user) {
      setLoggedIn(true);
      findUserInDB(user.sub);
      console.log(user);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      updateUserWalletInDB(user.sub, encryptedWallet, addressNamesObject);
    }
  }, [encryptedWallet]);

  useEffect(() => {
    if (networkProvider) {
      web3.setProvider(networkProviders[networkProvider]);
    }
    if (networkProviderChanged) {
      web3.setProvider(networkProviders[networkProvider]);
      if (JSON.parse(localStorage.getItem(`${networkProvider} wallet`)).length == 0) {
        web3.eth.accounts.wallet.clear();
        setUserWallet(Object.entries(JSON.parse(localStorage.getItem(`${networkProvider} wallet`))));
      } else {
        web3.eth.accounts.wallet.clear();
        web3.eth.accounts.wallet = web3.eth.accounts.wallet.decrypt(
          JSON.parse(localStorage.getItem(`${networkProvider} wallet`)),
          user.name
        );
        setUserWallet(Object.entries(web3.eth.accounts.wallet));
      }
      setNetworkProviderChanged(false);
    }
  }, [networkProvider]);

  let createEncryptedWalletObject = async () => {
    let encryptedWalletObject = {};
    for (const networkName in networkProviders) {
      if (Object.hasOwnProperty.call(networkProviders, networkName)) {
        encryptedWalletObject[networkName] = {
          wallet: JSON.parse(localStorage.getItem(`${networkName} wallet`)),
        };
      }
    }
    setEncryptedWallet(encryptedWalletObject);
  };

  let findUserInDB = (user_id) => {
    fetch("/api/findUserInDB", {
      method: "POST",
      body: JSON.stringify({ DBUrl: dbUrl, user_id: user_id }),
    }).then((response) => {
      response.json().then(async (response) => {
        console.log(response);
        if (response.data.ethWalletAccountByUserId !== null) {
          if (response.data.ethWalletAccountByUserId.addressNames !== null) {
            console.log(response.data.ethWalletAccountByUserId.addressNames);
            addressNamesObject = response.data.ethWalletAccountByUserId.addressNames;
          }
          if (response.data.ethWalletAccountByUserId.wallet !== null) {
            if (response.data.ethWalletAccountByUserId.wallet[networkProvider].wallet !== null) {
              console.log(response.data.ethWalletAccountByUserId.wallet[networkProvider].wallet);
              web3.eth.accounts.wallet = web3.eth.accounts.wallet.decrypt(
                response.data.ethWalletAccountByUserId.wallet[networkProvider].wallet,
                user.name
              );
              setUserWallet(Object.entries(web3.eth.accounts.wallet));
              web3.eth.accounts.wallet.save(user.name, `${networkProvider} wallet`);
              createEncryptedWalletObject();
            }
          }
        }

        if (response.data.ethWalletAccountByUserId == null) {
          web3.eth.accounts.wallet.save(user.name, `${networkProvider} wallet`);
          createEncryptedWalletObject();
          addUserToDB(user_id, encryptedWallet, addressNamesObject);
        } else if (response.data.ethWalletAccountByUserId.wallet == null) {
          web3.eth.accounts.wallet.save(user.name, `${networkProvider} wallet`);
          createEncryptedWalletObject();
          updateUserWalletInDB(user_id, encryptedWallet, addressNamesObject);
        } else if (response.data.ethWalletAccountByUserId.wallet[networkProvider].wallet == null) {
          web3.eth.accounts.wallet.save(user.name, `${networkProvider} wallet`);
          createEncryptedWalletObject();
          updateUserWalletInDB(user_id, encryptedWallet, addressNamesObject);
        }
        return response;
      });
    });
  };

  let addUserToDB = (user_id, wallet, addressNames) => {
    console.log(wallet);
    fetch("/api/addUserToDB", {
      method: "POST",
      body: JSON.stringify({ DBUrl: dbUrl, user_id: user_id, wallet: wallet, addressNames: addressNames }),
    }).then((response) => {
      response.json().then((response) => {
        console.log("user added to db", response);
      });
    });
  };

  let updateUserWalletInDB = (user_id, wallet, addressNames) => {
    fetch("/api/updateUserWalletInDB", {
      method: "POST",
      body: JSON.stringify({ DBUrl: dbUrl, user_id: user_id, wallet: wallet, addressNames: addressNames }),
    }).then((response) => {
      response.json().then((response) => {
        console.log("updated user wallets", response);
      });
    });
  };

  let addNewAddress = () => {
    let name = window.prompt("Enter the name you would like this account to have");
    web3.eth.accounts.wallet.create(1);
    addressNamesObject[web3.eth.accounts.wallet[web3.eth.accounts.wallet.length - 1].address] = name;
    console.log(addressNamesObject);
    setUserWallet(Object.entries(web3.eth.accounts.wallet));
    web3.eth.accounts.wallet.save(user.name, `${networkProvider} wallet`);
    createEncryptedWalletObject();
  };

  return (
    <div className={styles.container}>
      <div style={{ position: "absolute", margin: "0px auto", top: "60px" }} className={styles.title}>
        MetaGate
      </div>
      {loggedIn ? (
        <div>
          {userWallet ? (
            <div>
              <div className={styles.smallHorizontalFlexContainer}>
                <div
                  onClick={() => {
                    addNewAddress();
                  }}
                  className={styles.card}>
                  <button type="button">Create New Account</button>
                </div>
                <div className={styles.dropdown}>
                  <div className={styles.card}>
                    <button>{networkProvider}</button>
                  </div>
                  <div
                    style={{ margin: "-15px auto 0px auto" }}
                    className={`${styles.card} ${styles.dropdownContent}`}>
                    {Object.entries(networkProviders).map((network) => {
                      if (network[0] == networkProvider) {
                        return null;
                      }
                      return (
                        <button
                          key={network[0]}
                          onClick={() => {
                            setNetworkProvider(network[0]);
                            web3.setProvider(networkProviders[network[0]]);
                            setNetworkProviderChanged(true);
                          }}>
                          {network[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {userWallet.length == 0 ? null : (
                <div className={styles.accountContainer}>
                  {userWallet.map((account) => {
                    if (
                      account[0] == "_accounts" ||
                      account[0] == "defaultKeyName" ||
                      account[0] == "length" ||
                      /[a-zA-Z]/g.test(account[0])
                    ) {
                      return null;
                    }
                    return (
                      <div style={{ width: "95%" }} className={styles.card}>
                        <h2>
                          {addressNamesObject[account[1].address]
                            ? addressNamesObject[account[1].address]
                            : JSON.parse(account[0]) + 1}
                          <i>:</i>
                        </h2>
                        <p>Public address: {JSON.stringify(account[1].address)}</p>
                        <p>Coins: {JSON.stringify(account[1].address)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => {
                for (const networkName in networkProviders) {
                  if (Object.hasOwnProperty.call(networkProviders, networkName)) {
                    const networkUrl = networkProviders[networkName];
                    web3.setProvider(networkUrl);
                    web3.eth.accounts.wallet.create();
                    setUserWallet(Object.entries(web3.eth.accounts.wallet));
                    web3.eth.accounts.wallet.save(user.name, `${networkName} wallet`);
                    setEncryptedWallet(localStorage.getItem(`${networkName} wallet`));
                  }
                }
                createEncryptedWalletObject();
                web3.setProvider(networkProviders[networkProvider]);
                web3.setProvider(networkProviders[networkProvider]);
                findUserInDB(user.sub);
              }}
              className={styles.card}>
              <button type="button">Create Wallet</button>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.card}>
          <button>
            <a href="/api/auth/login">Login</a>
          </button>
        </div>
      )}
    </div>
  );
}
