/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/time_locked.json`.
 */
export type TimeLocked = {
  address: '5F3APs596H15YQeVXRfTYQwAGv2ynQCXJvDC9fc7LXUR';
  metadata: {
    name: 'timeLocked';
    version: '0.1.0';
    spec: '0.1.0';
    description: 'Created with Anchor';
  };
  instructions: [
    {
      name: 'initializeLock';
      discriminator: [182, 214, 195, 105, 58, 73, 81, 124];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: 'account';
                path: 'payer';
              },
              {
                kind: 'arg';
                path: 'id';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'id';
          type: 'string';
        },
        {
          name: 'amount';
          type: 'u64';
        },
        {
          name: 'unlockTime';
          type: 'i64';
        },
      ];
    },
    {
      name: 'splInitialize';
      discriminator: [209, 8, 4, 153, 234, 109, 138, 159];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'mint';
          writable: true;
        },
        {
          name: 'payerTokenAccount';
          writable: true;
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: 'account';
                path: 'payer';
              },
              {
                kind: 'arg';
                path: 'id';
              },
            ];
          };
        },
        {
          name: 'vaultTokenAccount';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'vault';
              },
              {
                kind: 'account';
                path: 'tokenProgram';
              },
              {
                kind: 'account';
                path: 'mint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'tokenProgram';
        },
        {
          name: 'associatedTokenProgram';
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'id';
          type: 'string';
        },
        {
          name: 'amount';
          type: 'u64';
        },
        {
          name: 'unlockTime';
          type: 'i64';
        },
      ];
    },
    {
      name: 'splWithdraw';
      discriminator: [19, 162, 188, 159, 156, 209, 209, 45];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'vault';
          writable: true;
        },
        {
          name: 'mint';
          writable: true;
        },
        {
          name: 'payerTokenAccount';
          writable: true;
        },
        {
          name: 'vaultTokenAccount';
          writable: true;
        },
        {
          name: 'tokenProgram';
        },
        {
          name: 'associatedTokenProgram';
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [];
    },
    {
      name: 'withdraw';
      discriminator: [183, 18, 70, 156, 148, 109, 161, 34];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'vault';
          writable: true;
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [];
    },
  ];
  accounts: [
    {
      name: 'vault';
      discriminator: [211, 8, 232, 43, 2, 152, 117, 119];
    },
  ];
  errors: [
    {
      code: 6000;
      name: 'vaultAlreadyExists';
      msg: 'Vault already exists';
    },
    {
      code: 6001;
      name: 'vaultDoesNotExist';
      msg: 'Vault does not exist';
    },
    {
      code: 6002;
      name: 'vaultNotUnlocked';
      msg: 'Vault is not unlocked';
    },
    {
      code: 6003;
      name: 'vaultIsNotSplToken';
      msg: 'Vault is not a SPL token';
    },
  ];
  types: [
    {
      name: 'vault';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'id';
            type: 'string';
          },
          {
            name: 'owner';
            type: 'pubkey';
          },
          {
            name: 'mint';
            type: {
              option: 'pubkey';
            };
          },
          {
            name: 'decimals';
            type: {
              option: 'u8';
            };
          },
          {
            name: 'amount';
            type: 'u64';
          },
          {
            name: 'unlockTime';
            type: 'i64';
          },
          {
            name: 'createdAt';
            type: 'i64';
          },
          {
            name: 'bump';
            type: 'u8';
          },
        ];
      };
    },
  ];
};
