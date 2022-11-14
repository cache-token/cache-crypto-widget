import React from 'react';
import { Text } from '@chakra-ui/react';
type Props = {
  message: String;
  type?: String;
};
const AlertMessage = ({ message, type }: Props) => {
  return (
    <Text fontSize={15} color={type === 'SUCCESS' ? 'green.200' : 'red.400'}>
      {message}
    </Text>
  );
};

export default AlertMessage;
