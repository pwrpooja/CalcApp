import { LightningElement } from 'lwc';

export default class Helloworld extends LightningElement {
greeting ='world';
changeHandler(event){
    this.greeting=event.target.value;
}
}