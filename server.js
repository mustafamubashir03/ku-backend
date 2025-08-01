import dotenv from "dotenv"
import httpServer from "./app.js"
import connectToDB from "./Database/db.js"
dotenv.config({
    path:"./.env"
})

connectToDB().then(()=>{
    httpServer.listen(process.env.PORT,()=>{
        console.log("Server with Socket.IO is listening on port 3000")
    })
}).catch((err)=>{
    console.log("Error in running server")
})

