import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { contractABI, contractAddress } from "../utils/constants";
import axios from "axios";


export const TransactionContext = React.createContext<any | null>(null);

const { ethereum } = window as any;

const createEthereumContract = () => {
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = provider.getSigner();
  const transactionsContract = new ethers.Contract(contractAddress, contractABI, signer);

  return transactionsContract;
};

export const TransactionsProvider = ({ children }:any) => {
  const [formData, setformData] = useState({ addressTo: "", amount: "", keyword: "", message: "" });
  const [currentAccount, setCurrentAccount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState(localStorage.getItem("transactionCount"));
  const [transactions, setTransactions] = useState([]);

  
  const disconnectWallet = () => {
    setCurrentAccount(""); 
    sessionStorage.removeItem("walletConnected"); 
  };

  const handleChange = (e:any, name:any) => {
    setformData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  const getAllTransactions = async () => {
    try {
      if (ethereum) {
        const transactionsContract = createEthereumContract();

        const availableTransactions = await transactionsContract.getAllTransactions();

        const structuredTransactions = availableTransactions.map((transaction:any) => ({
          addressTo: transaction.receiver,
          addressFrom: transaction.sender,
          timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),
          message: transaction.message,
          keyword: transaction.keyword,
          amount: parseInt(transaction.amount._hex) / (10 ** 18)
        }));

        console.log(structuredTransactions);

        setTransactions(structuredTransactions);
      } else {
        console.log("Ethereum is not present");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const checkIfWalletIsConnect = async () => {
    try {
      if (!ethereum) return alert("Please install MetaMask.");

      const accounts = await ethereum.request({ method: "eth_accounts" });

      if (accounts.length) {
        setCurrentAccount(accounts[0]);

        getAllTransactions();
      } else {
        console.log("No accounts found");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const checkIfTransactionsExists = async () => {
    try {
      if (ethereum) {
        const transactionsContract = createEthereumContract();
        const currentTransactionCount = await transactionsContract.getTransactionCount();

        window.localStorage.setItem("transactionCount", currentTransactionCount);
      }
    } catch (error) {
      console.log(error);

      throw new Error("No ethereum object");
    }
  };


  const connectWallet = async () => {
    if (!ethereum) return alert("Please install MetaMask.");
  
    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      if (accounts.length) {
        setCurrentAccount(accounts[0]);
        sessionStorage.setItem("walletConnected", "true"); 
  
        await updateEthereumAddressInBackend(accounts[0]);
  
      }
    } catch (error) {
      console.error("Error connecting to wallet:", error);
    }
  };
  


  const updateEthereumAddressInBackend = async (ethereumAddress: any) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        return;
      }
      await axios.post('http://localhost:3001/api/users/updateEthereumAddress', {
        ethereumAddress,

      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Ethereum address updated successfully in backend');
    } catch (error) {
      console.error('Error updating Ethereum address in backend', error);
    }
  };

  
  const checkIfWalletIsConnected = async () => {
    try {
      if (!ethereum) return alert("Please install MetaMask.");
  
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (accounts.length) {
        setCurrentAccount(accounts[0]);
        sessionStorage.setItem("walletConnected", "true");
      } else if (!sessionStorage.getItem("walletConnected")) {
        setCurrentAccount("");
        sessionStorage.removeItem("walletConnected");
      }
    } catch (error) {
      console.log(error);
    }
  };
  


  const sendTransaction = async () => {
    let statusObj = { status: 'pending', message: 'Processing your transaction...' };
    try {
      if (ethereum) {
        const { addressTo, amount, keyword, message } = formData;
        const transactionsContract = createEthereumContract();
        const parsedAmount = ethers.utils.parseEther(amount);

        await ethereum.request({
          method: "eth_sendTransaction",
          params: [{
            from: currentAccount,
            to: addressTo,
            gas: "0x5208",
            value: parsedAmount._hex,
          }],
        });

        const transactionHash = await transactionsContract.addToBlockchain(addressTo, parsedAmount, message, keyword);

        setIsLoading(true);
        console.log(`Loading - ${transactionHash.hash}`);
        await transactionHash.wait();
        console.log(`Success - ${transactionHash.hash}`);
        setIsLoading(false);

        const transactionsCount = await transactionsContract.getTransactionCount();
        setTransactionCount(transactionsCount.toNumber());

        statusObj = { status: 'success', message: 'Your transaction was successful!' }; 


        return {
          status: 'success',
          message: 'Your transaction was successful!',
          transactionDetails: { addressTo, amount, keyword, message }
        };     
      } else {
        console.log("No ethereum object");
        statusObj = { status: 'Unsuccess', message: 'Unsuccessful Payment! There was an issue with your transaction.' };


        return {
          status: "Unsuccess",
          message: 'Your transaction was not successful!'
        }
      }
    } catch (error) {
      console.log(error);
      statusObj = { status: 'Unsuccess', message: 'Unsuccessful Payment! There was an issue with your transaction.' };
      throw new Error("No ethereum object");

      
    }
    
    return statusObj;
  };

  useEffect(() => {
    checkIfWalletIsConnected();
    checkIfWalletIsConnect();
    checkIfTransactionsExists();
  }, [transactionCount]);

  return (
    <TransactionContext.Provider
      value={{
        transactionCount,
        connectWallet,
        transactions,
        currentAccount,
        isLoading,
        sendTransaction,
        handleChange,
        formData,
        disconnectWallet,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};