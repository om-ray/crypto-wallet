export default function handler(req, res) {
  req.body = JSON.parse(req.body);

  console.log(req.body.wallet);

  fetch(req.body.DBUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
      mutation MyMutation($userId: String = "", $wallet: JSON, $addressNames: JSON ) {
        createEthWalletAccount(
          input: {ethWalletAccount: {userId: $userId, wallet: $wallet, addressNames: $addressNames}}
        ) {
          ethWalletAccount {
            userId
            wallet
            addressNames
          }
        }
      }`,
      variables: {
        userId: req.body.user_id,
        wallet: req.body.wallet,
        addressNames: req.body.addressNames,
      },
    }),
  })
    .then((response) => {
      response.json().then((response) => {
        res.status(200).send(response);
      });
    })
    .catch((err) => {
      res.status(500).send(err);
    });
}
