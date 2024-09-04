import { Model } from 'mongoose';
import { IContact } from '../../models/contactModel';
import { IContactRepository } from '../interface/IContactRepository';

class ContactRepository implements IContactRepository {
  constructor(private ContactModel: Model<IContact>) {}

  async createContact(contactData: Partial<IContact>): Promise<IContact> {
    const contact = new this.ContactModel(contactData);
    return contact.save();
  }

  async getAllContacts(): Promise<IContact[]> {
    return this.ContactModel.find().exec();
  }
}

export default ContactRepository;