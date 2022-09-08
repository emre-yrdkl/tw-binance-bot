const needle=require("needle")
const got = require('got');
const Binance = require('binance-api-node').default
require("dotenv").config()
const TWTOKEN= procces.env.TOKEN
const colors=require("colors")

const rulesURL="https://api.twitter.com/2/tweets/search/stream/rules"
const streamURL="https://api.twitter.com/2/tweets/search/stream?expansions=author_id"

const rules=[{"value": "from:XXX"}]


const client = Binance({
    apiKey: procces.env.APIKEY,
    apiSecret: procces.env.APISECRETKEY
  })
  
//-----------------------------------------------------------------
 // heroku wants port to run code 
  var express = require('express');
  var app     = express();
  
  app.set('port', (process.env.PORT || 5000));
  
  //For avoidong Heroku $PORT error
  app.get('/', function(request, response) {
      var result = 'App is running'
      response.send(result);
  }).listen(app.get('port'), function() {
      console.log('App is running, server is listening on port ', app.get('port'));
  });
//-----------------------------------------------------------------


function getDataSec(prp) {
    let coin = prp + "USDT"
    got(`https://api.binance.com/api/v3/ticker/price?symbol=${coin}`, { json: true }).then(response => {
    //console.log(response.body.data.prices[1].price);
    a = response.body.price;
    var num = parseFloat(a);
    console.log(num);

  }).catch(error => {
    console.log("error.response.body");
  })
  }


  
   const binanceOrder = async (prop) =>{
    try {
  
        let coin = prop + "USDT"
        
        const orderBuy = await client.order({
        symbol: coin,
        side: 'BUY',
        type: 'MARKET',
        quoteOrderQty: "15",
        })

        const date = new Date();
        let second = date.getSeconds();
        let waitSec = 59 - second;
        waitSec = waitSec*1000
        console.log("waitsec: ", waitSec);

        const getOrd = await client.getOrder({
            symbol: coin,
            orderId: orderBuy.orderId,
        })
        //wait here
        //console.log(getOrd.executedQty);

        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        const x = setInterval(getDataSec(prop),1000)
        await sleep(waitSec);

        // sell coin at the end of the candlestick
        const sellCoin = await client.order({
        symbol: coin,
        side: 'SELL',
        type: 'MARKET',
        quantity: getOrd.executedQty,
        })
        await sleep(3000);
        clearInterval(x)

    } catch (error) {
        console.log(error);
    }
}


async function getRules(){
    const response= await needle('get',rulesURL,{
        headers:{
            Authorization: `Bearer ${TWTOKEN}`
        }
    })
    return response.body
}
async function setRules(){
    const data={
        add: rules
    }
    const response= await needle('post',rulesURL,data,{
        headers:{
            'content-type':'application/json',
            Authorization: `Bearer ${TWTOKEN}`
        }
    })
    return response.body
}
async function deleteRules(rules){
    if(!Array.isArray(rules.data)){
        return null
    }
    const ids=rules.data.map((rule=>{
        return rule.id
    }))
    const data={
        delete: {
            ids:ids
        }
    }
    const response= await needle('post',rulesURL,data,{
        headers:{
            'content-type':'application/json',
            Authorization: `Bearer ${TWTOKEN}`
        }
    })
    console.log("delete rules:", response.body);
    return response.body
}

function streamTweets(){
    console.log("Stream started".green)
    const stream=needle.get(streamURL,{
        headers:{
            Authorization: `Bearer ${TWTOKEN}`
        }
    })
    stream.on("data",(data)=>{
        try{
            const json = JSON.parse(data)
            const text = json.data.text

            let position = text.search(process.env.MATCHSTRING)
            if(position!==-1){
                console.log("give order");

                // customizable for tweet
                let result1 = text.search("#");
                let result2 = text.search(" ");
                let result3 = text.search("BİNANCE");
                let result4 = text.search("/")
                
                let minInd = result2;
                if(minInd > result3-1){
                    minInd = result3-1;
                }
                if(minInd > result4 && result4!== -1 ){
                    minInd = result4;
                }
                
                let coin = text.slice(result1+1, minInd)
                console.log("coin: ",coin);
                binanceOrder(coin)
            }


            else{
                console.log("dont give order");
            }

            console.log(json.data.text)
        }catch(error){
            console.log("err: ",error);
        }
    })
}
(async()=>{
    let currentrules
    try{
        
        currentrules=await getRules()
        //console.log(currentrules);
        await deleteRules(currentrules)
        //console.log("----------")
        await setRules()
        //console.log(currentrules)
        currentrules=await getRules()
        //console.log(currentrules)
    }
    catch(error){
        console.error(error)
        process.exit(1)
    }
    streamTweets()

})()

