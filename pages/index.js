import styles from "../styles/Home.module.css";
import Web3 from "web3";
import { useCallback, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0";
import { useEffect } from "react";
import CopyAddressIcon from "./components/CopyAddressIcon";
import CloseIcon from "./components/CloseIcon";
import ClipboardJS from "clipboard";
import { getEthPriceNow } from "get-eth-price";

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

function groupBy(arr, property) {
  return arr?.reduce(function (memo, x) {
    if (!memo[x[property]]) {
      memo[x[property]] = [];
    }
    memo[x[property]].push(x);
    return memo;
  }, {});
}

let convertToUSD = async function (ETH) {
  let test;
  let balUSD;
  await getEthPriceNow("USD").then((data) => {
    test = Object.keys(data)[0];
    balUSD = data[test].ETH.USD * ETH;
  });
  return balUSD.toFixed(2);
};

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
  let [NFTS, setNFTS] = useState(() => null);
  let [coins, setCoins] = useState(() => null);
  let [balance, setBalance] = useState(() => null);
  let [USDBalance, setUSDBalance] = useState(() => null);
  let [address, setAddress] = useState(() => null);
  let [showingAccountDetails, setShowingAccountDetails] = useState(() => false);
  let [showCoins, setShowCoins] = useState(() => true);
  let [showNFTs, setShowNFTs] = useState(() => false);

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
    addressNamesObject[web3.eth.accounts.wallet[web3.eth.accounts.wallet.length - 1].address] = name
      ? name
      : web3.eth.accounts.wallet[web3.eth.accounts.wallet.length - 1].index + 1;
    console.log(addressNamesObject);
    setUserWallet(Object.entries(web3.eth.accounts.wallet));
    web3.eth.accounts.wallet.save(user.name, `${networkProvider} wallet`);
    createEncryptedWalletObject();
  };

  let openAccountDetails = async (address) => {
    await fetch(
      `https://deep-index.moralis.io/api/v2/${address}/nft?chain=eth&format=decimal&order=token_address.ASC`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-api-key": "Q3Zg3JYiD2uaEbeyeVtHVOfdQDN2ERvqqVX7M15HHa2kXq1uBIy1BpM9hk918OLV",
        },
      }
    ).then((nfts) => {
      nfts.json().then((nfts) => {
        nfts = groupBy(nfts.result, "name");
        nfts = Object.entries(nfts);
        if (nfts) {
          console.log(nfts);
          setNFTS(nfts);
        }
        console.log("nfts found");
      });
    });

    await fetch(`https://deep-index.moralis.io/api/v2/${address}/erc20?chain=eth`, {
      method: "GET",
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-api-key": "Q3Zg3JYiD2uaEbeyeVtHVOfdQDN2ERvqqVX7M15HHa2kXq1uBIy1BpM9hk918OLV",
      },
    }).then((coins) => {
      coins.json().then((coins) => {
        if (coins) {
          console.log(coins);
          setCoins(coins);
        }
        console.log("coins found");
      });
    });

    await fetch(`https://deep-index.moralis.io/api/v2/${address}/balance?chain=eth`, {
      method: "GET",
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-api-key": "Q3Zg3JYiD2uaEbeyeVtHVOfdQDN2ERvqqVX7M15HHa2kXq1uBIy1BpM9hk918OLV",
      },
    }).then((balance) => {
      balance.json().then(async (balance) => {
        if (balance) {
          console.log(balance.balance);
          setBalance(balance.balance);
          setUSDBalance(await convertToUSD(balance.balance));
        }
        console.log("balance found");
      });
    });

    setAddress(address);
    setShowingAccountDetails(true);
  };

  return (
    <div className={styles.container}>
      <div style={{ position: "absolute", margin: "0px auto", top: "60px" }} className={styles.title}>
        OMNI-VERSE
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
                      <div
                        onClick={() => {
                          openAccountDetails(account[1].address);
                        }}
                        style={{ width: "95%" }}
                        className={styles.card}>
                        <h2>
                          {addressNamesObject[account[1].address]
                            ? addressNamesObject[account[1].address]
                            : JSON.parse(account[0]) + 1}
                          <i>:</i>
                        </h2>
                        <p>Public address: {account[1].address}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              {showingAccountDetails ? (
                <div
                  style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(0, 0, 0, 0.4)",
                  }}>
                  <div
                    style={{
                      position: "absolute",
                      top: "15%",
                      width: "70%",
                      left: "15%",
                      height: "70%",
                      backgroundColor: "white",
                    }}
                    className={styles.accountContainer}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "baseline",
                        borderBottom: "1px solid #eaeaea",
                        margin: "0px 20px",
                      }}>
                      <h1
                        style={{
                          margin: "0px 20px 10px 0px",
                          width: "fit-content",
                          fontSize: "40px",
                          fontWeight: "400",
                        }}>
                        {addressNamesObject[address]}
                      </h1>
                      <button
                        style={{ width: "120px", display: "flex" }}
                        data-clipboard-text={address}
                        className="copy"
                        onClick={() => {
                          new ClipboardJS(".copy");
                          window.alert("Address copied to clipboard");
                        }}>
                        <p
                          style={{
                            textOverflow: "ellipsis",
                            height: "fit-content",
                            width: "80px",
                            overflow: "auto",
                            fontSize: "12px",
                            fontWeight: "300",
                            margin: "0px 5px 0px 0px",
                            color: "#989a9b",
                          }}>
                          {address}
                        </p>
                        <CopyAddressIcon></CopyAddressIcon>
                      </button>
                      <div
                        onClick={() => {
                          setShowingAccountDetails(false);
                        }}
                        style={{ position: "absolute", top: "10px", right: "10px", cursor: "pointer" }}>
                        <CloseIcon></CloseIcon>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-evenly",
                        width: "15%",
                        margin: "0px 0px -15px 10px",
                        fontFamily: "Playfair display",
                        fontWeight: "400",
                      }}>
                      <button
                        onClick={() => {
                          setShowCoins(true);
                          setShowNFTs(false);
                        }}
                        style={
                          showCoins
                            ? {
                                background: "#0077FF",
                                border: "1px solid #0077FF",
                                width: "60px",
                                height: "30px",
                                margin: "10px 0px 10px 0px",
                                borderRadius: "5px",
                                color: "white",
                              }
                            : {
                                background: "#fff",
                                border: "none",
                                width: "60px",
                                height: "30px",
                                margin: "10px 0px 10px 0px",
                                borderRadius: "5px",
                                color: "black",
                              }
                        }>
                        Coins
                      </button>
                      <button
                        onClick={() => {
                          setShowNFTs(true);
                          setShowCoins(false);
                        }}
                        style={
                          showNFTs
                            ? {
                                background: "#0077FF",
                                border: "1px solid #0077FF",
                                width: "60px",
                                height: "30px",
                                margin: "10px 0px 10px 0px",
                                borderRadius: "5px",
                                color: "white",
                              }
                            : {
                                background: "#fff",
                                border: "none",
                                width: "60px",
                                height: "30px",
                                margin: "10px 0px 10px 0px",
                                borderRadius: "5px",
                                color: "black",
                              }
                        }>
                        NFT's
                      </button>
                    </div>
                    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex" }}>
                      <div style={{ height: "84%", width: "70%" }}>
                        <div style={{ height: "100%" }} className={styles.accountContainer}>
                          {showCoins
                            ? coins.map((coin) => {
                                return <div className={styles.card}>{coin.name}</div>;
                              })
                            : null}
                          {showNFTs
                            ? NFTS.map((nft) => {
                                return <div className={styles.card}>{nft.name}</div>;
                              })
                            : null}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div
                          style={{
                            width: "131%",
                            height: "20%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            marginBottom: "5px",
                            padding: "20px",
                          }}
                          className={styles.card}>
                          <h3
                            style={{
                              fontFamily: "Playfair display",
                              margin: "-5px 0px 5px 0px",
                              borderBottom: "1px solid #eaeaea",
                              width: "70%",
                              textAlign: "center",
                              padding: "0px 0px 15px 0px",
                            }}>
                            Balance
                          </h3>
                          <p style={{ fontSize: "14px", margin: "5px" }}>
                            {balance} <b style={{ fontFamily: "Playfair display" }}>ETH</b>
                          </p>
                          <p style={{ fontSize: "14px", margin: "5px" }}>
                            $ {USDBalance} <b style={{ fontFamily: "Playfair display" }}>USD</b>
                          </p>
                        </div>
                        <div
                          className={styles.card}
                          style={{
                            width: "131%",
                            height: "7%",
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            borderRadius: "10px",
                            backgroundColor: "#0077ff",
                            color: "#fff",
                            justifyContent: "space-evenly",
                            padding: "0px",
                            marginBottom: "5px",
                          }}>
                          <button
                            style={{
                              color: "white",
                              width: "40%",
                              fontSize: "15px",
                              borderRight: "1px solid white",
                              height: "100%",
                              fontFamily: "roboto slab",
                              fontWeight: "300",
                            }}>
                            Buy
                          </button>
                          <button
                            style={{
                              color: "white",
                              width: "40%",
                              fontSize: "15px",
                              height: "100%",
                              fontFamily: "roboto slab",
                              fontWeight: "300",
                            }}>
                            Send
                          </button>
                          <button
                            style={{
                              color: "white",
                              width: "40%",
                              fontSize: "15px",
                              borderLeft: "1px solid white",
                              height: "100%",
                              fontFamily: "roboto slab",
                              fontWeight: "300",
                            }}>
                            Swap
                          </button>
                        </div>
                        <div
                          style={{
                            width: "131%",
                            height: "51.5%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            padding: "20px",
                          }}
                          className={styles.card}>
                          <h3
                            style={{
                              fontFamily: "Playfair display",
                              margin: "-5px 0px 5px 0px",
                              borderBottom: "1px solid #eaeaea",
                              width: "70%",
                              textAlign: "center",
                              padding: "0px 0px 15px 0px",
                            }}>
                            Transactions
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
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
