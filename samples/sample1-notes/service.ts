import { Body, Delete, Get, PathParam, Post, Public, Put, QueryParam, Service } from "../../src";

@Service()
export class NoteService {

    @Public()
    @Get("/notes")
    public getAll(@QueryParam("filter") filter?: string) {
        return { action: "This action returns all notes", filter };
    }

    @Public()
    @Get("/notes/{id}")
    public getOne(@PathParam("id") id: string) {
        return { action: "This action returns note", id };
    }

    @Public()
    @Post("/notes")
    public post(@Body() note: any) {
        return { action: "Saving note...", note };
    }

    @Public()
    @Put("/notes/{id}")
    public put(@PathParam("id") id: string, @Body() note: any) {
        return { action: "Updating a note...", id, note };
    }

    @Public()
    @Delete("/notes/{id}")
    public remove(@PathParam("id") id: string) {
        return { action: "Removing note...", id };
    }
}