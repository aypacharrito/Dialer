export function dialDigits(value:string){
  return value.replace(/\D/g,"").slice(-10);
}

export function findDialedContact<T extends {phone:string}>(contacts:T[],value:string){
  const digits=dialDigits(value);
  if(digits.length<7)return undefined;
  return contacts.find(contact=>dialDigits(contact.phone)===digits);
}

export function createCallStartGate(){
  let starting=false;
  return {
    tryStart(){
      if(starting)return false;
      starting=true;
      return true;
    },
    finish(){starting=false},
    isStarting(){return starting},
  };
}
