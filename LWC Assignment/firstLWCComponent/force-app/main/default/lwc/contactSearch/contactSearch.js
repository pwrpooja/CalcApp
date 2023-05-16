import { LightningElement, track, wire} from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { deleteRecord } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import searchContacts from '@salesforce/apex/WrapperContact.searchContacts';

//defining actions for each row of the table
const actions = [
          { label: 'View', name: 'view', iconName: 'utility:preview'},
          { label: 'Edit', name: 'edit', iconName: 'utility:edit' },
          { label: 'Delete', name: 'delete', iconName: 'utility:delete' }
        ];

//defining columns for the table
const COLUMNS = [
          { label: 'Name', fieldName: 'Name', type: 'text'},
          { label: 'Email', fieldName: 'Email', type: 'email' },
          { label: 'Mobile', fieldName: 'MobilePhone', type: 'phone' },
          { label: 'Billing City', fieldName: 'BillingCity', type: 'text' },
          { label: 'Billing State', fieldName: 'BillingState', type: 'text' },
          { label: '', type: 'action', typeAttributes: { rowActions: actions, menuAlignment: 'right', iconName: 'utility:down', iconAlternativeText: 'Action' }, }
        ];

export default class ContactTable extends NavigationMixin(LightningElement) {
  columns = COLUMNS; // Initializing columns with defined values
  contactList;    // Initializing contactList variable
  searchKey;     // Initializing searchKey variable
  showTable = false;

  connectedCallback() {
    this.showTable = false;
  }
  
  @track isEdited = false;

  handleInputChange(event) {
    let searchKeys = event.target.value;
    if (searchKeys === '') {
        this.contactList = [];
        this.showTable = false;
    }     
    else {
      this.showTable =true;
        this.searchKey = searchKeys;
        return refreshApex(this.contactList);
    }
  }

  // Retrieving contactList by calling wire with the Apex method and searchKey parameter
  @wire(searchContacts, {textKey : '$searchKey'}) contactList;
  //This function will create a new contact
wiredContactList(value) {
 this.contactList = value;
const { data, error } = value;
if (data) {
    // Data is available, refresh Apex
refreshApex(this.contactList);
} else if (error) {
    // Handle error
    this.error = error;
    }
}
    


  handleContactCreate() {
    this[NavigationMixin.Navigate]({
      type: 'standard__objectPage',
      attributes:
      {
        objectApiName: 'Contact',
        actionName: 'new'
      }
    });
  }

  handleSuccess(event) {
    // Show success message
    const toastEvent = new ShowToastEvent({
    title: "Contact created",
    message: "New contact has been created",
    variant: "success"
    });
    this.dispatchEvent(toastEvent);
    
    
    
    // Clear input field
    this.searchKey = '';

    return refreshApex(this.contactList);
    }

  //This function will return view, edit, delete the record based what will select in action
  callRowAction(event) {
    const actionName = event.detail.action.name;
    const row = event.detail.row;
    this.recordId = row.Id;
    switch (actionName) {
      case 'view':
        this[NavigationMixin.Navigate]({
          type: 'standard__recordPage',
          attributes: {
            recordId: row.Id,
            actionName: 'view'
          }
        });
        break;

      case 'edit':
        this.editContact(row.Id);
        break;
      case 'delete':
        this.delContact();
        return refreshApex(this.contactList); // Record will be deleted
    }
  }

  editContact(recordId) {
    this[NavigationMixin.Navigate]({
      type: 'standard__recordPage',
      attributes: {
        recordId: recordId,
        objectApiName: 'Contact',
        actionName: 'edit'   
      }
    }).then(() => {
    return refreshApex(this.contactList);
  }).then(() => {
    let editedRecord = this.contactList.data.find(contact => contact.Id === recordId);
    if (editedRecord) {
      // Use the getRecord function to get the updated record data
      // and update the corresponding row in the contact list
      getRecord(recordId, { fields: COLUMNS.map(column => column.fieldName) })
        .then(record => {
          this.contactList.data = this.contactList.data.map(contact => {
            if (contact.Id === recordId) {
              return { ...record, ...{ Id: contact.Id } };
            } else {
              return contact;
            }
          });
        });
    }
  }).catch(error => {
    console.log(error);
  });
  }

  //This function created for deleting the record
  delContact() {
    //Invoke the deleteRecord to delete a record
    deleteRecord(this.recordId)
      .then(() => {
        this.dispatchEvent(
          new ShowToastEvent({
            title: 'Success',
            message: 'Record is successfully deleted',
            variant: 'success'
          })
        );
        return refreshApex(this.contactList);
      })
      .catch((error) => {
        console.log(error);
        this.dispatchEvent(
          new ShowToastEvent({
            title: 'Sorry',
            message: 'Cannot delete this record since it is associated with a case',
            variant: 'error'
          })
        );
      });
  }
}