export interface Guide{
    id:number, 
    name:string,
}

export interface User {
    id: number,
    email: string,
    password_hash: string, 
    display_name: string, 
    role: string, 
    createdAt: string, 
}
