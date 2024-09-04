import { IContact } from '../../models/contactModel';

export interface IContactRepository {
  createContact(contactData: Partial<IContact>): Promise<IContact>;
  getAllContacts(): Promise<IContact[]>;
}