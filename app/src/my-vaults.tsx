import {
  DeleteOutlined,
  LockOutlined,
  LogoutOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { type ProgramAccount } from '@coral-xyz/anchor';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Spin,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import Countdown from './components/ui/countdown';
import { DEFAULT_TOKEN } from './constants';
import { useContract } from './hooks/useContract';
import { useWallet } from '@solana/wallet-adapter-react';

const MyVaults = () => {
  const { disconnect } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    vaults,
    isLoading,
    form,
    submitting,
    onSubmit,
    contextHolder,
    withdraw,
    mutate,
    wallet,
  } = useContract();
  const tokenValue = Form.useWatch('token', form);

  if (isLoading) return <Spin className='text-white' />;

  return (
    <main className='pointer-events-auto w-full mt-4'>
      {contextHolder}
      <div className='flex items-center justify-between w-full mb-4'>
        <p className='mr-2'>
          Wallet: {wallet?.publicKey?.toBase58().slice(0, 4)}...
          {wallet?.publicKey?.toBase58().slice(-4)}
        </p>
        <Button danger onClick={disconnect} icon={<LogoutOutlined />} />
      </div>
      <div className='flex w-full items-center justify-between'>
        <p>Total vaults: {vaults?.length}</p>
        <Button
          onClick={() => setIsModalOpen(true)}
          type='primary'
          icon={<PlusOutlined />}
        />
      </div>
      <div className='mt-4'>
        {vaults?.map((vault) => (
          <VaultCard
            key={vault.account.id}
            vault={vault}
            withdraw={withdraw}
            mutate={mutate}
          />
        ))}
      </div>

      <Modal
        title='New Vault'
        closable={{ 'aria-label': 'Custom Close Button' }}
        open={isModalOpen}
        centered
        onCancel={() => setIsModalOpen(false)}
        footer={
          <>
            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type='primary' onClick={onSubmit} loading={submitting}>
              Create
            </Button>
          </>
        }
      >
        <Form form={form} layout='vertical'>
          <Form.Item
            label='Token'
            name='token'
            rules={[{ required: true, message: 'Please select a token' }]}
          >
            <Select
              options={DEFAULT_TOKEN}
              onChange={(value) => {
                form.setFieldValue('mint', value);
                if (value === 'OTHER') {
                  form.setFieldValue('mint', '');
                }
              }}
            />
          </Form.Item>
          {tokenValue === 'OTHER' && (
            <Form.Item
              label='Mint'
              name='mint'
              rules={[
                { required: true, message: 'Please paste your mint address' },
              ]}
            >
              <Input
                onChange={(e) => {
                  form.setFieldValue('mint', e.target.value);
                }}
                placeholder='Paste your mint address'
              />
            </Form.Item>
          )}
          <Form.Item
            label='Amount'
            name='amount'
            rules={[{ required: true, message: 'Please enter an amount' }]}
          >
            <InputNumber className='!w-full' />
          </Form.Item>
          <Form.Item
            label='Unlock Time'
            name='unlockTime'
            rules={[{ required: true, message: 'Please select a unlock time' }]}
          >
            <DatePicker className='!w-full' showTime />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  );
};

const VaultCard = ({
  vault,
  withdraw,
  mutate,
}: {
  vault: ProgramAccount;
  withdraw: (id: string, mint?: string) => void;
  mutate: () => void;
}) => {
  const targetDate = dayjs(Number(vault.account.unlockTime) * 1000).toDate();
  const amount = vault.account.mint
    ? Number(vault.account.amount) / 10 ** Number(vault.account.decimals)
    : Number(vault.account.amount) / LAMPORTS_PER_SOL;

  const isUnlocked = dayjs().isAfter(dayjs(targetDate));

  return (
    <Card className='!mb-2'>
      <div className='flex items-center justify-between'>
        <div className='flex flex-col items-start'>
          <p>ID: {vault.account.id}</p>
          <p>
            {amount}{' '}
            {vault.account.mint
              ? `TOKEN: ${vault.account.mint
                  .toBase58()
                  .slice(0, 4)} ...${vault.account.mint.toBase58().slice(-4)}`
              : 'SOL'}
          </p>
          <p>Unlock: {dayjs(targetDate).format('DD/MM/YYYY HH:mm')}</p>
          <p>
            Remaining: <Countdown targetDate={targetDate} onComplete={mutate} />
          </p>
        </div>
        {isUnlocked ? (
          <Button
            onClick={() =>
              withdraw(
                vault.account.id.toString(),
                vault.account.mint?.toBase58(),
              )
            }
            type='primary'
            icon={<DeleteOutlined />}
          >
            Withdraw
          </Button>
        ) : (
          <Button disabled type='primary' icon={<LockOutlined />} />
        )}
      </div>
    </Card>
  );
};

export default MyVaults;
