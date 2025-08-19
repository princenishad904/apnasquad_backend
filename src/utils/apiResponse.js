
export const apiResponse = (res,statusCode,data,message,success= true)=>{

    return res.status(statusCode).json({
        status:statusCode,
        data:{...data},
        message,
        success
    })
}
