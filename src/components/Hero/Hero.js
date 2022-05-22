import React from 'react';
import { Section, SectionTitle } from '../../styles/GlobalComponents';
import { LeftSection } from './HeroStyles';

const Hero = (props) => (
  <Section row nopadding>
    <LeftSection>
      <SectionTitle main center>
        Hi, I'm Slobodan <br/>
        a Web Developer<br/>

      </SectionTitle>
      
    </LeftSection>
  </Section>
);

export default Hero;