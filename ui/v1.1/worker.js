// worker.js
self.onmessage = (event) => {
    const { operation, data } = event.data;
  
    if (operation === 'calculate') {
      // Perform a computationally expensive operation
      const result = heavyCalculation(data);
      self.postMessage(result); // Send result back to the main thread
    }
  };
  
  // Example heavy calculation function
  function heavyCalculation(n) {
    let sum = 0;
    for (let i = 1; i <= n; i++) {
      sum += i;
    }
    return sum;
  }