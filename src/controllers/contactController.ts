import { Request, Response } from 'express';
import { IContactRepository } from '../repository/interface/IContactRepository';
import ContactRepository from '../repository/implementation/ContactRepository';
import contactModel from '../models/contactModel';
import mongoose from 'mongoose';

export class ContactController {
  constructor(private contactRepository: IContactRepository) {}

  createContact = async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, phone, message } = req.body;
      const newContact = await this.contactRepository.createContact({
        firstName,
        lastName,
        email,
        message,
      });
      res.status(201).json(newContact);
    } catch (error:any) {
      if (error instanceof Error && error.name === 'ValidationError') {
        const validationErrors = (error as mongoose.Error.ValidationError).errors;
        const errorMessage = Object.values(validationErrors)
          .map((error) => error.message)
          .join(', ');
        res.status(400).json({ error: errorMessage });
      } else {
        console.error('Error creating contact:', error);
        res.status(500).json({ error: 'Error creating contact' });
      }
    }
  };

  getAllContacts = async (_req: Request, res: Response) => {
    try {
      const contacts = await this.contactRepository.getAllContacts();
      res.status(200).json(contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      res.status(500).json({ message: 'Error fetching contacts' });
    }
  };
}

const contactRepository = new ContactRepository(contactModel);
const contactController = new ContactController(contactRepository);

export const createContact = contactController.createContact;
export const getAllContacts = contactController.getAllContacts;