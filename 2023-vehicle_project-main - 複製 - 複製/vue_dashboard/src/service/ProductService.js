export default class ProductService {
  getv1() {
      return fetch('mock/v1.json') // Make sure the path is correct relative to the public directory
          .then(response => response.json()) // Convert the response to JSON format
          .then(data => {
              // Log the entire data array to see what's fetched
              console.log(data);
              
              // Return the full data array including time, fileName, fileSize, and hash
              return data;
          })
          .catch(error => {
              console.error('Error fetching JSON data:', error); // Handle errors
          });
  }
}