import WalletConnectProvider from "@walletconnect/web3-provider";
//import Torus from "@toruslabs/torus-embed"
import WalletLink from "walletlink";
import { Alert, Button, Col, Menu, Row } from "antd";
import "antd/dist/antd.css";
import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, HashRouter, Link, Route, Switch } from "react-router-dom";
import Web3Modal from "web3modal";
import "./App.css";
import { Account, Contract, Faucet, GasGauge, Header, Ramp, ThemeSwitch } from "./components";
import { INFURA_ID, NETWORK, NETWORKS, FARMS, STAKING_POOL_ADDRESSES, legacyFarms, sushiFarms, swaprFarms, peggFarms, dopexFarms, towerFarms, honeyFarms } from "./constants";
import { Transactor } from "./helpers";
import {
  useBalance,
  useExternalContractLoader,
  useContractLoader,
  useContractReader,
  useEventListener,
  useExchangePrice,
  useGasPrice,
  useOnBlock,
  useUserProvider,
} from "./hooks";
// import Hints from "./Hints";
import { HomeUI, FarmUI } from "./views";
import Portis from "@portis/web3";
import Fortmatic from "fortmatic";
import Authereum from "authereum";
import FarmInfo from "./views/FarmInfo";
import NyanFarms from "./views/NyanFarms";
import LegacyFarms from "./views/LegacyFarms";
import TotalValueLocked from "./views/TotalValueLocked";
const { ethers } = require("ethers");

/* contracts and abis */
import NyanTokenAddress from "./contracts/NyanToken.address";
import NyanTokenAbi from "./contracts/NyanToken.abi";
import NyanETHSushiLPAddress from "./contracts/NyanETHSushiLP.address";
import ERC20Abi from "./contracts/ERC20.abi";
import WETHTokenAddress from "./contracts/WETHToken.address";

/* others */
import { formatEther } from "ethers/lib/utils";
import RelatedLPFarms from "./views/RelatedLPFarms";
import ArbisFarms from "./views/ArbisFarms";

/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/austintgriffith/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS.matic; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;
const NETWORKCHECK = true;

// 🛰 providers
if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");
// const mainnetProvider = getDefaultProvider("mainnet", { infura: INFURA_ID, etherscan: ETHERSCAN_KEY, quorum: 1 });
// const mainnetProvider = new InfuraProvider("mainnet",INFURA_ID);
//
// attempt to connect to our own scaffold eth rpc and if that fails fall back to infura...
// Using StaticJsonRpcProvider as the chainId won't change see https://github.com/ethers-io/ethers.js/issues/901
const scaffoldEthProvider = navigator.onLine ? new ethers.providers.StaticJsonRpcProvider("https://rpc.scaffoldeth.io:48544") : null;
const poktMainnetProvider = navigator.onLine ? new ethers.providers.StaticJsonRpcProvider("https://eth-mainnet.gateway.pokt.network/v1/lb/613fb8d6cd5fd000335ce59f") : null;
const mainnetInfura = navigator.onLine ? new ethers.providers.StaticJsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID) : null;
// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_I )

// 🏠 Your local provider is usually pointed at your local blockchain
const localProviderUrl = targetNetwork.rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
if (DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new ethers.providers.StaticJsonRpcProvider(localProviderUrlFromEnv);

// 🔭 block explorer URL
const blockExplorer = targetNetwork.blockExplorer;

// Coinbase walletLink init
const walletLink = new WalletLink({
  appName: 'coinbase',
});

// WalletLink provider
const walletLinkProvider = walletLink.makeWeb3Provider(
  `https://mainnet.infura.io/v3/${INFURA_ID}`,
  1,
);

// Portis ID: 6255fb2b-58c8-433b-a2c9-62098c05ddc9
/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new Web3Modal({
  network: "mainnet", // Optional. If using WalletConnect on xDai, change network to "xdai" and add RPC info below for xDai chain.
  cacheProvider: true, // optional
  theme: "light", // optional. Change to "dark" for a dark theme.
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        bridge: "https://polygon.bridge.walletconnect.org",
        infuraId: INFURA_ID,
        rpc: {
          1: `https://mainnet.infura.io/v3/${INFURA_ID}`, // mainnet // For more WalletConnect providers: https://docs.walletconnect.org/quick-start/dapps/web3-provider#required
          42: `https://kovan.infura.io/v3/${INFURA_ID}`,
          100: "https://dai.poa.network", // xDai
        },
      },

    },
    portis: {
      display: {
        logo: "https://user-images.githubusercontent.com/9419140/128913641-d025bc0c-e059-42de-a57b-422f196867ce.png",
        name: "Portis",
        description: "Connect to Portis App",
      },
      package: Portis,
      options: {
        id: "6255fb2b-58c8-433b-a2c9-62098c05ddc9",
      },
    },
    fortmatic: {
      package: Fortmatic, // required
      options: {
        key: "pk_live_5A7C91B2FC585A17", // required
      },
    },
    // torus: {
    //   package: Torus,
    //   options: {
    //     networkParams: {
    //       host: "https://localhost:8545", // optional
    //       chainId: 1337, // optional
    //       networkId: 1337 // optional
    //     },
    //     config: {
    //       buildEnv: "development" // optional
    //     },
    //   },
    // },
    'custom-walletlink': {
      display: {
        logo: 'https://play-lh.googleusercontent.com/PjoJoG27miSglVBXoXrxBSLveV6e3EeBPpNY55aiUUBM9Q1RCETKCOqdOkX2ZydqVf0',
        name: 'Coinbase',
        description: 'Connect to Coinbase Wallet (not Coinbase App)',
      },
      package: walletLinkProvider,
      connector: async (provider, options) => {
        await provider.enable();
        return provider;
      },
    },
    authereum: {
      package: Authereum, // required
    }
  },
});



function App(props) {
  const mainnetProvider = poktMainnetProvider && poktMainnetProvider._isProvider ? poktMainnetProvider : scaffoldEthProvider && scaffoldEthProvider._network ? scaffoldEthProvider : mainnetInfura;

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const ethUSDPrice = useExchangePrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userSigner = useUserProvider(injectedProvider, localProvider);

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }
    getAddress();
  }, [userSigner]);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userSigner, gasPrice);

  // Faucet Tx can be used to send funds from the faucet
  const faucetTx = Transactor(localProvider, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider);

  // If you want to make 🔐 write transactions to your contracts, use the userSigner:
  const writeContracts = useContractLoader(userSigner, { chainId: localChainId });

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  const mainnetContracts = useContractLoader(mainnetProvider);

  // If you want to call a function on a new block
  useOnBlock(mainnetProvider, () => {
    // console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
  });

  // Then read your DAI balance like:
  const myMainnetDAIBalance = useContractReader(mainnetContracts, "DAI", "balanceOf", [
    "0x34aA3F359A9D614239015126635CE7732c18fDF3",
  ]);

  // keep track of a variable from the contract in the local React state:
  const purpose = useContractReader(readContracts, "YourContract", "purpose");

  // 📟 Listen for broadcast events
  const setPurposeEvents = useEventListener(readContracts, "YourContract", "SetPurpose", localProvider, 1);

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

  /* compute NYAN/ETH price */
  /* 1) query NYAN token contract for LP balance */
  const nyanTokenInstance = useExternalContractLoader(injectedProvider, NyanTokenAddress, NyanTokenAbi);
  const nyanLPBalance = useContractReader({ NyanToken: nyanTokenInstance }, "NyanToken", "balanceOf", [NyanETHSushiLPAddress]);
  /* 2) query WETH token contract for LP balance */
  const wethTokenInstance = useExternalContractLoader(injectedProvider, WETHTokenAddress, ERC20Abi);
  const wethLPBalance = useContractReader({ ERC20: wethTokenInstance }, "ERC20", "balanceOf", [NyanETHSushiLPAddress])
  /* we mul by 2 because an AMM pool is 50% tokenA + 50% tokenB, so if tokenA is ETH, the total value of the pool in ETH is tokenA * 2 */
  const nyanETHPrice = (wethLPBalance && nyanLPBalance) ? (2 * parseFloat(formatEther(wethLPBalance)) / parseFloat(formatEther(nyanLPBalance))) : undefined;

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  useEffect(() => {
    if (
      DEBUG &&
      mainnetProvider &&
      address &&
      selectedChainId &&
      yourLocalBalance &&
      yourMainnetBalance &&
      readContracts &&
      writeContracts &&
      mainnetContracts
    ) {
     /*  console.log("_____________________________________ 🏗 scaffold-eth _____________________________________");
      console.log("🌎 mainnetProvider", mainnetProvider);
      console.log("🏠 localChainId", localChainId);
      console.log("👩‍💼 selected address:", address);
      console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);
      console.log("💵 yourLocalBalance", yourLocalBalance ? ethers.utils.formatEther(yourLocalBalance) : "...");
      console.log("💵 yourMainnetBalance", yourMainnetBalance ? ethers.utils.formatEther(yourMainnetBalance) : "...");
      console.log("📝 readContracts", readContracts);
      console.log("🌍 DAI contract on mainnet:", mainnetContracts);
      console.log("💵 yourMainnetDAIBalance", myMainnetDAIBalance);
      console.log("🔐 writeContracts", writeContracts);
  */   }
  }, [
    mainnetProvider,
    address,
    selectedChainId,
    yourLocalBalance,
    yourMainnetBalance,
    readContracts,
    writeContracts,
    mainnetContracts,
  ]);

  let networkDisplay = "";
  if (NETWORKCHECK && localChainId && selectedChainId && localChainId !== selectedChainId) {
    const networkSelected = NETWORK(selectedChainId);
    const networkLocal = NETWORK(localChainId);
    if (selectedChainId === 1337 && localChainId === 31337) {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message="⚠️ Wrong Network ID"
            description={
              <div>
                You have <b>chain id 1337</b> for localhost and you need to change it to <b>31337</b> to work with
                HardHat.
                <div>(MetaMask -&gt; Settings -&gt; Networks -&gt; Chain ID -&gt; 31337)</div>
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    } else {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message="⚠️ Wrong Network"
            description={
              <div>
                You have <b>{networkSelected && networkSelected.name}</b> selected and you need to be on{" "}
                <Button
                  onClick={async () => {
                    const ethereum = window.ethereum;
                    const data = [
                      {
                        chainId: "0x" + targetNetwork.chainId.toString(16),
                        chainName: targetNetwork.name,
                        nativeCurrency: targetNetwork.nativeCurrency,
                        rpcUrls: [targetNetwork.rpcUrl],
                        blockExplorerUrls: [targetNetwork.blockExplorer],
                      },
                    ];
                    console.log("data", data);
                    const tx = await ethereum.request({ method: "wallet_addEthereumChain", params: data }).catch();
                    if (tx) {
                      console.log(tx);
                    }
                  }}
                >
                  <b>{networkLocal && networkLocal.name}</b>
                </Button>
                .
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    }
  } else {
    networkDisplay = (
      <div style={{ zIndex: -1, position: "absolute", right: 154, top: 28, padding: 16, color: targetNetwork.color }}>
        {targetNetwork.name}
      </div>
    );
  }

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));

    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname);
  }, [setRoute]);

  let faucetHint = "";
  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name.indexOf("local") !== -1;

  const [faucetClicked, setFaucetClicked] = useState(false);
  if (
    !faucetClicked &&
    localProvider &&
    localProvider._network &&
    localProvider._network.chainId === 31337 &&
    yourLocalBalance &&
    ethers.utils.formatEther(yourLocalBalance) <= 0
  ) {
    faucetHint = (
      <div style={{ padding: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            faucetTx({
              to: address,
              value: ethers.utils.parseEther("0.01"),
            });
            setFaucetClicked(true);
          }}
        >
          💰 Grab funds from the faucet ⛽️
        </Button>
      </div>
    );
  }
  //console.log(`userProvider is ${userSigner}`);

  return (
    <div className="App">
      <TotalValueLocked
        injectedProvider={injectedProvider}
        ethUSDPrice={ethUSDPrice}
        nyanETHPrice={nyanETHPrice}
      />
      {/* ✏️ Edit the header and change the title to your project name */}
      <Header />
      <HashRouter>
        <Menu style={{ display: "inline-block", textAlign: "center" }} selectedKeys={[route]} mode="horizontal">
          <Menu.Item key="/">
            <Link
              onClick={() => {
                setRoute("/");
              }}
              to="/"
            >
              Home
            </Link>
          </Menu.Item>
          <Menu.Item key="/nyan-farms">
            <Link
              onClick={() => {
                setRoute("/nyan-farms");
              }}
              to="/nyan-farms"
            >
              NYAN Farms
            </Link>
          </Menu.Item>

          <Menu.Item key="/arbis-farms">
            <Link
              onClick={() => {
                setRoute("/arbis-farms");
              }}
              to="/arbis-farms"
            >
              ARBIS Farms
            </Link>
          </Menu.Item>
         {/*  <Menu.Item key="/dopex-farms">
            <Link
              onClick={() => {
                setRoute("/dopex-farms");
              }}
              to="/dopex-farms"
            >
              Dopex Farms
            </Link>
          </Menu.Item> */}
          <Menu.Item key="/swapr-farms">
            <Link
              onClick={() => {
                setRoute("/swapr-farms");
              }}
              to="/swapr-farms"
            >
              Swapr Farms
            </Link>
          </Menu.Item>
          <Menu.Item key="/sushi-farms">
            <Link
              onClick={() => {
                setRoute("/sushi-farms");
              }}
              to="/sushi-farms"
            >
              Sushi Farms
            </Link>
          </Menu.Item>
         

         
          <Menu.Item key="/legacy-farms">
            <Link
              className="legacy-farm"
              onClick={() => {
                setRoute("/legacy-farms");
              }}
              to="/legacy-farms"
            >
              Legacy Farms
            </Link>
          </Menu.Item>
        </Menu>
        <Switch>
          <Route exact path="/">
            <HomeUI
              address={address}
              userSigner={userSigner}
              mainnetProvider={mainnetProvider}
              localProvider={localProvider}
              yourLocalBalance={yourLocalBalance}
              price={ethUSDPrice}
              tx={tx}
              writeContracts={writeContracts}
              readContracts={readContracts}
              purpose={purpose}
              setPurposeEvents={setPurposeEvents}
              injectedProvider={injectedProvider}
            />
          </Route>
          <Route path="/f/:farmId">
            <FarmInfo
              nyanETHPrice={nyanETHPrice}
              address={address}
              userSigner={userSigner}
              mainnetProvider={mainnetProvider}
              localProvider={localProvider}
              yourLocalBalance={yourLocalBalance}
              price={ethUSDPrice}
              tx={tx}
              writeContracts={writeContracts}
              readContracts={readContracts}
              purpose={purpose}
              setPurposeEvents={setPurposeEvents}
              injectedProvider={injectedProvider} />
          </Route><Route path="/nyan-farms">
            <NyanFarms
              nyanETHPrice={nyanETHPrice}
              address={address}
              userSigner={userSigner}
              mainnetProvider={mainnetProvider}
              localProvider={localProvider}
              yourLocalBalance={yourLocalBalance}
              price={ethUSDPrice}
              tx={tx}
              writeContracts={writeContracts}
              readContracts={readContracts}
              purpose={purpose}
              setPurposeEvents={setPurposeEvents}
              injectedProvider={injectedProvider} />
          </Route>
          <Route path="/swapr-farms">
            <RelatedLPFarms
              address={address}
              userSigner={userSigner}
              mainnetProvider={mainnetProvider}
              localProvider={localProvider}
              yourLocalBalance={yourLocalBalance}
              price={ethUSDPrice}
              tx={tx}
              writeContracts={writeContracts}
              readContracts={readContracts}
              purpose={purpose}
              setPurposeEvents={setPurposeEvents}
              injectedProvider={injectedProvider}
              farms={swaprFarms}
              pageName={"Swapr Farms"}
              farmsURL={"https://swapr.eth.link/#/pools?chainId=42161"}
            />
          </Route>
          <Route path="/dopex-farms">
            <RelatedLPFarms
              address={address}
              userSigner={userSigner}
              mainnetProvider={mainnetProvider}
              localProvider={localProvider}
              yourLocalBalance={yourLocalBalance}
              price={ethUSDPrice}
              tx={tx}
              writeContracts={writeContracts}
              readContracts={readContracts}
              purpose={purpose}
              setPurposeEvents={setPurposeEvents}
              injectedProvider={injectedProvider}
              farms={dopexFarms}
              pageName={"Dopex Farms"}
              farmsURL={"https://app.dopex.io/farms"}
            />
          </Route>
          <Route path="/sushi-farms">
            <RelatedLPFarms
              address={address}
              userSigner={userSigner}
              mainnetProvider={mainnetProvider}
              localProvider={localProvider}
              yourLocalBalance={yourLocalBalance}
              price={ethUSDPrice}
              tx={tx}
              writeContracts={writeContracts}
              readContracts={readContracts}
              purpose={purpose}
              setPurposeEvents={setPurposeEvents}
              injectedProvider={injectedProvider}
              farms={sushiFarms}
              pageName={"Sushi Farms"}
              farmsURL={"https://app.sushi.com/farm"}
            />
          </Route>

        
          <Route path="/legacy-farms">
            <LegacyFarms
              address={address}
              userSigner={userSigner}
              mainnetProvider={mainnetProvider}
              localProvider={localProvider}
              yourLocalBalance={yourLocalBalance}
              price={ethUSDPrice}
              tx={tx}
              writeContracts={writeContracts}
              readContracts={readContracts}
              purpose={purpose}
              setPurposeEvents={setPurposeEvents}
              injectedProvider={injectedProvider}
              farms={legacyFarms}
            />
          </Route>
          <Route path="/arbis-farms">
            <ArbisFarms
              address={address}
              userSigner={userSigner}
              mainnetProvider={mainnetProvider}
              localProvider={localProvider}
              yourLocalBalance={yourLocalBalance}
              price={ethUSDPrice}
              tx={tx}
              writeContracts={writeContracts}
              readContracts={readContracts}
              purpose={purpose}
              setPurposeEvents={setPurposeEvents}
              injectedProvider={injectedProvider}
            />
          </Route>
        </Switch>
      </HashRouter>

      <ThemeSwitch />

      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
      <div style={{ position: "absolute", textAlign: "right", right: 0, top: "2em", padding: 10 }}>
        <Account
          address={address}
          localProvider={localProvider}
          userSigner={userSigner}
          mainnetProvider={mainnetProvider}
          price={ethUSDPrice}
          web3Modal={web3Modal}
          loadWeb3Modal={loadWeb3Modal}
          logoutOfWeb3Modal={logoutOfWeb3Modal}
          blockExplorer={blockExplorer}
        />
      </div>
      <div>
        <br />
        <br />
        <br />
        <br />
        {/* footer */}
        {/*  <p>2021 🐧 <a href="twitter.com/0xPuffin">0xPuffin</a></p> */}
        <p><a href="https://twitter.com/arbis_finance" target="_blank" rel="noopener noreferrer" className="arbis-red">Twitter</a> 
        {" "}|{" "} <a href="https://discord.gg/VkCZUUKmKN" target="_blank" rel="noopener noreferrer" className="arbis-red">Discord</a> 
        {" "}|{" "} <a href="https://github.com/Arbi-s" target="_blank" rel="noopener noreferrer" className="arbis-red">Github</a>
        {" "}|{" "} <a href="https://curlyfries.xyz" target="_blank" rel="noopener noreferrer" className="arbis-red">Analytics</a>
        {" "}|{" "} <a href="https://arbisfinance.gitbook.io/food-court/" target="_blank" rel="noopener noreferrer" className="arbis-red">Docs</a>
        </p>

      </div>

      {/* 🗺 Extra UI like gas price, eth price, faucet, and support: */}
      <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 20, padding: 10 }}>
        <Row align="middle" gutter={[4, 4]}>

          <Col span={8} style={{ textAlign: "center", opacity: 1 }}>
            <Button
              onClick={() => {
                window.open("https://discord.gg/3hUY25Jvdn");
              }}
              size="large"
              shape="round"
            >
              <span style={{ marginRight: 8 }} role="img" aria-label="support">
                💬
              </span>
              Support
            </Button>
          </Col>
        </Row>



      </div>
    </div>
  );
}

export default App;
