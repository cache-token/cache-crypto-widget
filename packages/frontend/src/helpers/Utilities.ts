import { IAppConfig } from '../models/Base';
import configDev from '../config/config.dev.json';
import configProd from '../config/config.prod.json';

export const getAppConfig = (): IAppConfig => {
  if (process.env.REACT_APP_MODE === 'production') {
    return configProd;
  } else {
    return configDev;
  }
}
