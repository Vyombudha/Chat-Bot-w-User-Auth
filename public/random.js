console.log("a");

 
let p = new Promise(resolve => {
    setTimeout(() => {
        return resolve('DONE')
    }, 1000);
});

p.then(val => console.log(val)
);


console.log("B");
