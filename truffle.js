module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  networks: {
      development: {
          host: "localhost",
          port: 8545,
          network_id: "*" // Match any network id
      }
      // development: {
      //     host: "127.0.0.1",
      //     port: 7545,
      //     network_id: "5777" // Match any network id
      // }
  }
};