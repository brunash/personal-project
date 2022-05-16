import React from 'react';
import { AiFillGithub, AiFillInstagram, AiFillLinkedin } from 'react-icons/ai';

import { SocialIcons } from '../Header/HeaderStyles';
import { CompanyContainer, FooterWrapper, LinkColumn, LinkItem, LinkList, LinkTitle, Slogan, SocialContainer, SocialIconsContainer } from './FooterStyles';

const Footer = () => {
  return (
    <FooterWrapper>
      <LinkList>
        <LinkColumn>
          <LinkTitle>Email</LinkTitle>
          <LinkItem href='mailto:slobodanzaja@gmail.com'>slobodanzaja@gmail.com</LinkItem>
        </LinkColumn>
        <SocialIconsContainer>
        <CompanyContainer>
          <Slogan></Slogan>
        </CompanyContainer>
        <SocialContainer>
        <SocialIcons href='https://github.com/brunash'>
          <AiFillGithub size='2.5rem'/>
        </SocialIcons>
        <SocialIcons href='https://linkedin.com/in/slobodanzaja'>
          <AiFillLinkedin size='2.5rem'/>
        </SocialIcons>
        </SocialContainer>
      </SocialIconsContainer>
      </LinkList>
      
    </FooterWrapper>
  );
};

export default Footer;
