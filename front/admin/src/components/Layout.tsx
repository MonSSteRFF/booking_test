import { AppShell, Burger, Group, NavLink, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBook, IconCalendar } from "@tabler/icons-react";
import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../app/Providers/AuthContext";

interface IProps {
	children: React.ReactNode;
}

export const Layout: React.FC<IProps> = ({ children }) => {
	const [opened, { toggle }] = useDisclosure();
	const { logout } = useAuth();
	const [location] = useLocation();

	return (
		<AppShell header={{ height: 60 }} navbar={{ width: 200, breakpoint: "sm", collapsed: { mobile: !opened } }} padding="md">
			<AppShell.Header>
				<Group h="100%" px="md">
					<Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
					<Title order={3}>Booking Admin</Title>
					<Group ml="auto">
						<NavLink component="button" label="Logout" onClick={logout} />
					</Group>
				</Group>
			</AppShell.Header>
			<AppShell.Navbar p="md">
				<NavLink
					component={Link}
					to="/slots"
					label="Slots"
					leftSection={<IconCalendar size="1rem" />}
					active={location.startsWith("/slots")}
				/>
				<NavLink
					component={Link}
					to="/bookings"
					label="Bookings"
					leftSection={<IconBook size="1rem" />}
					active={location.startsWith("/bookings")}
				/>
			</AppShell.Navbar>
			<AppShell.Main>{children}</AppShell.Main>
		</AppShell>
	);
};
