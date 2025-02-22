export interface Tag extends Record<string, any> {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}