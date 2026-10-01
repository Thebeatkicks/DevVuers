export interface Guide{
    id:number, 
    title:string,
    slug:string,
    region:string,
    difficulty:string,
    lengthKm:number,
    bodyHtml:string,
    heroImage?:string,
    published:boolean,
    authorId?:number,
    updatedAt:Date
}
